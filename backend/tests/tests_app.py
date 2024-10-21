import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, date
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import json

# Import your main application file
import app  # Assuming your main file is named app.py

class TestWeatherApp(unittest.TestCase):

    def setUp(self):
        self.app = app.app
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        with self.app.app_context():
            app.db.create_all()

    def tearDown(self):
        with self.app.app_context():
            app.db.session.remove()
            app.db.drop_all()

    @patch('app.requests.get')
    def test_fetch_weather_data(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "main": {
                "temp": 25,
                "temp_max": 28,
                "temp_min": 22,
                "humidity": 60
            },
            "wind": {"speed": 5},
            "weather": [{"description": "Cloudy"}]
        }
        mock_get.return_value = mock_response

        with self.app.app_context():
            result = app.fetch_weather_data("TestCity")

        self.assertEqual(result["main"]["temp"], 25)
        self.assertEqual(result["weather"][0]["description"], "Cloudy")

    @patch('app.fetch_weather_data')
    def test_update_weather_data(self, mock_fetch):
        mock_fetch.return_value = {
            "main": {
                "temp": 25,
                "temp_max": 28,
                "temp_min": 22,
                "humidity": 60
            },
            "wind": {"speed": 5},
            "weather": [{"description": "Cloudy"}]
        }

        with self.app.app_context():
            app.update_weather_data()
            weather_data = app.WeatherData.query.filter_by(city="Delhi").first()

        self.assertIsNotNone(weather_data)
        self.assertEqual(weather_data.avg_temp, 25)
        self.assertEqual(weather_data.dominant_weather, "Cloudy")

    def test_current_weather_endpoint(self):
        with patch('app.fetch_weather_data') as mock_fetch:
            mock_fetch.return_value = {
                "main": {
                    "temp": 25,
                    "temp_max": 28,
                    "temp_min": 22,
                    "humidity": 60
                },
                "wind": {"speed": 5},
                "weather": [{"description": "Cloudy"}]
            }

            response = self.client.get('/api/weather/current')
            data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertIn("Delhi", data)
        self.assertEqual(data["Delhi"]["avg_temp"], 25)

    def test_historical_data_endpoint(self):
        with self.app.app_context():
            weather_entry = app.WeatherData(
                city="TestCity",
                avg_temp=25,
                max_temp=28,
                min_temp=22,
                humidity=60,
                wind_speed=5,
                dominant_weather="Sunny",
                date=date.today()
            )
            app.db.session.add(weather_entry)
            app.db.session.commit()

            response = self.client.get('/api/weather/historical')
            data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["city"], "TestCity")
        self.assertEqual(data[0]["avg_temp"], 25)

    @patch('app.fetch_weather_data')
    def test_alerts_endpoint(self, mock_fetch):
        mock_fetch.return_value = {
            "main": {
                "temp": 36,
                "humidity": 85
            },
            "wind": {"speed": 16}
        }

        response = self.client.get('/api/weather/alerts')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        expected_alerts = len(app.CITIES) * 3  # 3 alerts per city
        self.assertEqual(len(data), expected_alerts)
        
        alert_types = set()
        for alert in data:
            if "Temperature exceeded 35°C" in alert["message"]:
                alert_types.add("temperature")
            elif "High humidity levels detected" in alert["message"]:
                alert_types.add("humidity")
            elif "High wind speed detected" in alert["message"]:
                alert_types.add("wind")
        
        self.assertEqual(len(alert_types), 3)  # Ensure all three types of alerts are present

if __name__ == '__main__':
    unittest.main()