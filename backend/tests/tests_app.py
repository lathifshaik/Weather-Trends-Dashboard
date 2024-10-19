import unittest
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from app import app as main_app, fetch_weather_data
from backend.models import init_db, DailyWeatherSummary, db

class WeatherAppTestCase(unittest.TestCase):
    
    def setUp(self):
        """Create a test client and a temporary database."""
        self.app = main_app
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'  # In-memory database for tests
        self.app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        self.client = self.app.test_client()
        
        # Initialize the database
        with self.app.app_context():
            init_db(self.app)

    def tearDown(self):
        """Clean up after each test."""
        with self.app.app_context():
            # Drop all tables
            db.drop_all()

    def test_fetch_weather_data(self):
        """Test the fetch_weather_data function."""
        weather_data = fetch_weather_data()
        self.assertIsInstance(weather_data, dict)
        self.assertGreater(len(weather_data), 0)  # Check that we get data for at least one city
        for city, data in weather_data.items():
            self.assertIn('temp', data)
            self.assertIn('weather', data)

    def test_get_weather_endpoint(self):
        """Test the /api/weather endpoint."""
        response = self.client.get('/api/weather')
        self.assertEqual(response.status_code, 200)
        
        # Check that the response is in JSON format
        self.assertEqual(response.content_type, 'application/json')
        
        data = response.get_json()
        self.assertIsInstance(data, dict)  # Ensure the response is a dictionary

        # Check if we have data for the cities
        expected_cities = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad']
        for city in expected_cities:
            self.assertIn(city, data)

    def test_database_insertion(self):
        """Test that the daily weather summaries are being inserted into the database."""
        with self.app.app_context():
            # Add a sample entry
            summary = DailyWeatherSummary(
                date="2024-10-17",
                city="Delhi",
                avg_temp=25.0,
                max_temp=30.0,
                min_temp=20.0,
                dominant_weather="Clear"
            )
            db.session.add(summary)
            db.session.commit()

            # Check if the entry is in the database
            self.assertEqual(DailyWeatherSummary.query.count(), 1)
            
            # Fetch the added entry
            added_summary = DailyWeatherSummary.query.first()
            self.assertEqual(added_summary.city, "Delhi")
            self.assertEqual(added_summary.avg_temp, 25.0)
            self.assertEqual(added_summary.max_temp, 30.0)
            self.assertEqual(added_summary.min_temp, 20.0)
            self.assertEqual(added_summary.dominant_weather, "Clear")

if __name__ == '__main__':
    unittest.main()
