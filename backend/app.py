import os
import requests
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from flask_cors import CORS
from dotenv import load_dotenv
import threading
import time

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///weather.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# List of cities to track
CITIES = ["Delhi", "Mumbai", "Chennai", "Bangalore", "Kolkata", "Hyderabad"]
API_KEY = os.getenv("OPENWEATHER_API_KEY")

# WeatherData Model to store weather data
class WeatherData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    city = db.Column(db.String(50), nullable=False)
    avg_temp = db.Column(db.Float, nullable=False)
    max_temp = db.Column(db.Float, nullable=False)
    min_temp = db.Column(db.Float, nullable=False)
    humidity = db.Column(db.Float, nullable=False)
    wind_speed = db.Column(db.Float, nullable=False)
    dominant_weather = db.Column(db.String(50), nullable=False)
    date = db.Column(db.Date, nullable=False)

def fetch_weather_data(city):
    """Fetch current weather data for a given city."""
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
    response = requests.get(url)
    return response.json()

def update_weather_data():
    """Update weather data for cities at a configurable interval (5 minutes)."""
    with app.app_context():  # Activate Flask application context
        today = datetime.now().date()
        for city in CITIES:
            try:
                data = fetch_weather_data(city)
                if data.get("main"):
                    avg_temp = data["main"]["temp"]
                    max_temp = data["main"]["temp_max"]
                    min_temp = data["main"]["temp_min"]
                    humidity = data["main"]["humidity"]
                    wind_speed = data["wind"]["speed"]
                    dominant_weather = data["weather"][0]["description"]

                    # Check if a summary for today already exists
                    existing_entry = WeatherData.query.filter_by(city=city, date=today).first()
                    if not existing_entry:
                        weather_entry = WeatherData(
                            city=city,
                            avg_temp=avg_temp,
                            max_temp=max_temp,
                            min_temp=min_temp,
                            humidity=humidity,
                            wind_speed=wind_speed,
                            dominant_weather=dominant_weather,
                            date=today
                        )
                        db.session.add(weather_entry)
                    else:
                        # Update the existing entry with new data
                        existing_entry.avg_temp = avg_temp
                        existing_entry.max_temp = max_temp
                        existing_entry.min_temp = min_temp
                        existing_entry.humidity = humidity
                        existing_entry.wind_speed = wind_speed
                        existing_entry.dominant_weather = dominant_weather
                else:
                    print(f"No data for {city}")
            except Exception as e:
                print(f"Error updating weather data for {city}: {e}")

        db.session.commit()  # Commit changes to the database

def weather_data_updater():
    """Continuously fetch weather data every 5 minutes."""
    while True:
        update_weather_data()
        time.sleep(300)  # 5-minute interval

@app.route('/api/weather/current', methods=['GET'])
def current_weather():
    """API endpoint to get current weather data for all cities."""
    weather_data = {}
    for city in CITIES:
        data = fetch_weather_data(city)
        if data.get("main"):
            weather_data[city] = {
                "avg_temp": data["main"]["temp"],
                "max_temp": data["main"]["temp_max"],
                "min_temp": data["main"]["temp_min"],
                "humidity": data["main"]["humidity"],
                "wind_speed": data["wind"]["speed"],
                "dominant_weather": data["weather"][0]["description"]
            }
    return jsonify(weather_data)



@app.route('/api/weather/historical', methods=['GET'])
def historical_data():
    """API endpoint to get historical weather data."""
    results = WeatherData.query.all()
    weather_history = []
    for entry in results:
        weather_history.append({
            "city": entry.city,
            "avg_temp": entry.avg_temp,
            "max_temp": entry.max_temp,
            "min_temp": entry.min_temp,
            "humidity": entry.humidity,
            "wind_speed": entry.wind_speed,
            "dominant_weather": entry.dominant_weather,
            "date": entry.date.isoformat()
        })
    return jsonify(weather_history)

@app.route('/api/weather/alerts', methods=['GET'])
def alerts():
    """API endpoint to check for weather alerts based on configurable thresholds."""
    alerts = []
    for city in CITIES:
        current_weather_data = fetch_weather_data(city)

        if current_weather_data.get("main"):
            avg_temp = current_weather_data["main"]["temp"]
            humidity = current_weather_data["main"]["humidity"]
            wind_speed = current_weather_data["wind"]["speed"]

            # Dynamic alert conditions
            if avg_temp > 35:
                alerts.append({
                    "id": len(alerts) + 1,
                    "city": city,
                    "message": f"Temperature exceeded 35°C in {city}. Current: {avg_temp:.1f}°C"
                })
            if humidity > 80:
                alerts.append({
                    "id": len(alerts) + 1,
                    "city": city,
                    "message": f"High humidity levels detected in {city}. Current: {humidity:.1f}%"
                })
            if wind_speed > 15:
                alerts.append({
                    "id": len(alerts) + 1,
                    "city": city,
                    "message": f"High wind speed detected in {city}. Current: {wind_speed:.1f} m/s"
                })

    if not alerts:
        alerts.append({"id": 0, "city": "None", "message": "No significant weather alerts at this time."})

    return jsonify(alerts)

def fetch_forecast_data(city):
    """Fetch 5-day weather forecast for a given city."""
    url = f"https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={API_KEY}&units=metric&cnt=40"
    response = requests.get(url)
    return response.json()

@app.route('/api/weather/forecast/<city>', methods=['GET'])
def forecast_weather(city):
    """API endpoint to get weather forecast for the next 5 days (3-hour intervals) for a specific city."""
    data = fetch_forecast_data(city)
    forecast_data = []
    if data.get("list"):
        for forecast in data["list"]:
            dt = forecast["dt"]
            # Convert timestamp to human-readable date and time
            date_time = datetime.utcfromtimestamp(dt)
            date_str = date_time.strftime("%Y-%m-%d")
            time_str = date_time.strftime("%H:%M:%S")

            avg_temp = forecast["main"]["temp"]
            max_temp = forecast["main"]["temp_max"]
            min_temp = forecast["main"]["temp_min"]
            humidity = forecast["main"]["humidity"]
            wind_speed = forecast["wind"]["speed"]
            dominant_weather = forecast["weather"][0]["description"]

            forecast_data.append({
                "city": city,
                "date": date_str,
                "time": time_str,
                "avg_temp": avg_temp,
                "max_temp": max_temp,
                "min_temp": min_temp,
                "humidity": humidity,
                "wind_speed": wind_speed,
                "dominant_weather": dominant_weather
            })

    return jsonify(forecast_data)



if __name__ == '__main__':
    with app.app_context():  # Initialize the database
        db.create_all()

    # Start the weather data updater in a background thread
    threading.Thread(target=weather_data_updater, daemon=True).start()

    # Run the Flask application
    app.run(debug=True)
