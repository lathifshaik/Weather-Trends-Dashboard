'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AlertCircle, Settings, Droplets, Wind, Sun, Cloud, CloudRain, CloudDrizzle, Snowflake } from "lucide-react"
import React from "react"

const API_BASE_URL = "http://localhost:5000/api"

export function WeatherDashboard() {
  const [weatherData, setWeatherData] = useState<Record<string, any>>({})
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [forecastData, setForecastData] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [tempUnit, setTempUnit] = useState<"kelvin" | "celsius" | "fahrenheit">("celsius")
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>("Bangalore");
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/weather/current`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setWeatherData(data)
      setError(null)
    } catch (error) {
      console.error("Error fetching current weather data:", error)
      setError("Failed to fetch current weather data. Please try again later.")
    }
  }

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/weather/historical`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setHistoricalData(data)
      setError(null)
    } catch (error) {
      console.error("Error fetching historical weather data:", error)
      setError("Failed to fetch historical weather data. Please try again later.")
    }
  }

  const fetchForecastData = async (city: string) => {
    setIsForecastLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/weather/forecast/${city}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setForecastData(data)
      setError(null)
    } catch (error) {
      console.error("Error fetching forecast data:", error)
      setError(`Failed to fetch forecast data for ${city}. Please try again later.`)
    } finally {
      setIsForecastLoading(false);
    }
  }

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/weather/alerts`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setAlerts(data)
      setError(null)
    } catch (error) {
      console.error("Error fetching weather alerts:", error)
      setError("Failed to fetch weather alerts. Please try again later.")
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await fetchWeatherData()
      await fetchHistoricalData()
      await fetchAlerts()
      setIsLoading(false);
    }

    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchForecastData(selectedCity);
  }, [selectedCity])

  const convertTemp = (temp: number) => {
    switch (tempUnit) {
      case "kelvin":
        return temp + 273.15
      case "fahrenheit":
        return (temp * 9/5) + 32
      default:
        return temp
    }
  }

  const renderDailySummary = () => {
    const data = Object.entries(weatherData).map(([city, data]) => ({
      city,
      avgTemp: convertTemp(data.avg_temp),
      maxTemp: convertTemp(data.max_temp),
      minTemp: convertTemp(data.min_temp),
      humidity: data.humidity,
      windSpeed: data.wind_speed
    }))

    return (
      <ChartContainer
        config={{
          avgTemp: {
            label: "Average Temperature",
            color: "hsl(var(--chart-1))",
          },
          maxTemp: {
            label: "Maximum Temperature",
            color: "hsl(var(--chart-2))",
          },
          minTemp: {
            label: "Minimum Temperature",
            color: "hsl(var(--chart-3))",
          },
          humidity: {
            label: "Humidity",
            color: "hsl(var(--chart-4))",
          },
          windSpeed: {
            label: "Wind Speed",
            color: "hsl(var(--chart-5))",
          },
        }}
        className="h-[400px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="city" />
            <YAxis yAxisId="left" label={{ value: `Temperature (${tempUnit === "kelvin" ? "K" : tempUnit === "fahrenheit" ? "°F" : "°C"})`, angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Humidity (%) / Wind Speed (m/s)', angle: 90, position: 'insideRight' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar yAxisId="left" dataKey="avgTemp" fill="var(--color-avgTemp)" name="Average Temperature" />
            <Bar yAxisId="left" dataKey="maxTemp" fill="var(--color-maxTemp)" name="Maximum Temperature" />
            <Bar yAxisId="left" dataKey="minTemp" fill="var(--color-minTemp)" name="Minimum Temperature" />
            <Bar yAxisId="right" dataKey="humidity" fill="var(--color-humidity)" name="Humidity" />
            <Bar yAxisId="right" dataKey="windSpeed" fill="var(--color-windSpeed)" name="Wind Speed" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    )
  }

  const renderHistoricalTrends = () => {
    const processedData = historicalData.reduce((acc, entry) => {
      const date = entry.date
      if (!acc[date]) {
        acc[date] = { date }
      }
      acc[date][`${entry.city}Temp`] = convertTemp(entry.avg_temp)
      acc[date][`${entry.city}Humidity`] = entry.humidity
      acc[date][`${entry.city}WindSpeed`] = entry.wind_speed
      return acc
    }, {})

    const data = Object.values(processedData)

    const cities = Array.from(new Set(historicalData.map(entry => entry.city)))

    return (
      <ChartContainer
        config={cities.reduce((acc, city, index) => {
          acc[`${city}Temp`] = {
            label: `${city} Temperature`,
            color: `hsl(${index * 60}, 70%, 50%)`,
          }
          acc[`${city}Humidity`] = {
            label: `${city} Humidity`,
            color: `hsl(${index * 60}, 70%, 70%)`,
          }
          acc[`${city}WindSpeed`] = {
            label: `${city} Wind Speed`,
            color: `hsl(${index * 60}, 70%, 90%)`,
          }
          return acc
        }, {})}
        className="h-[400px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" label={{ value: `Temperature (${tempUnit === "kelvin" ? "K" : tempUnit === "fahrenheit" ? "°F" : "°C"})`, angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Humidity (%) / Wind Speed (m/s)', angle: 90, position: 'insideRight' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {cities.map((city, index) => (
              <React.Fragment key={city}>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={`${city}Temp`}
                  stroke={`hsl(${index * 60}, 70%, 50%)`}
                  name={`${city} Temperature`}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={`${city}Humidity`}
                  stroke={`hsl(${index * 60}, 70%, 70%)`}
                  name={`${city} Humidity`}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={`${city}WindSpeed`}
                  stroke={`hsl(${index * 60}, 70%, 90%)`}
                  name={`${city} Wind Speed`}
                />
              </React.Fragment>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    )
  }

  const renderForecast = () => {
    if (isForecastLoading) {
      return <div className="flex justify-center items-center h-64">
        <p className="text-lg">Loading forecast data...</p>
      </div>;
    }

    if (forecastData.length === 0) {
      return <div className="text-center">No forecast data available.</div>;
    }

    const data = forecastData.map(entry => ({
      ...entry,
      avg_temp: convertTemp(entry.avg_temp),
      max_temp: convertTemp(entry.max_temp),
      min_temp: convertTemp(entry.min_temp),
      datetime: `${entry.date} ${entry.time}`
    }));

    const getWeatherIcon = (weather: string) => {
      if (weather.includes('rain')) return <CloudRain className="w-4 h-4" />;
      if (weather.includes('drizzle')) return <CloudDrizzle className="w-4 h-4" />;
      if (weather.includes('snow')) return <Snowflake className="w-4 h-4" />;
      if (weather.includes('cloud')) return <Cloud className="w-4 h-4" />;
      return <Sun className="w-4 h-4" />;
    };

    return (
      <ChartContainer
        config={{
          avg_temp: {
            label: "Temperature",
            color: "hsl(var(--chart-1))",
          },
          humidity: {
            label: "Humidity",
            color: "hsl(var(--chart-2))",
          },
          wind_speed: {
            label: "Wind Speed",
            color: "hsl(var(--chart-3))",
          },
        }}
        className="h-[400px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="datetime" 
              tickFormatter={(value) => new Date(value).toLocaleString()}
            />
            <YAxis 
              yAxisId="left" 
              label={{ value: `Temperature (${tempUnit === "kelvin" ? "K" : tempUnit === "fahrenheit" ? "°F" : "°C"})`, angle: -90, position: 'insideLeft' }} 
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              label={{ value: 'Humidity (%) / Wind Speed (m/s)', angle: 90, position: 'insideRight' }} 
            />
            <ChartTooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background p-2 border rounded shadow">
                      <p className="font-bold">{new Date(label).toLocaleString()}</p>
                      <p className="flex items-center">
                        {getWeatherIcon(data.dominant_weather)}
                        <span className="ml-2">{data.dominant_weather}</span>
                      </p>
                      <p>Temperature: {data.avg_temp.toFixed(1)}°</p>
                      <p>Humidity: {data.humidity}%</p>
                      <p>Wind Speed: {data.wind_speed} m/s</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="avg_temp" stroke="var(--color-avg_temp)" name="Temperature" />
            <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="var(--color-humidity)" name="Humidity" />
            <Line yAxisId="right" type="monotone" dataKey="wind_speed" stroke="var(--color-wind_speed)" name="Wind Speed" />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  };

  return (
    <div className="container mx-auto p-4">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading weather data...</p>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">Weather Dashboard</h1>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2" />
                User Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Temperature Unit</label>
                <Select value={tempUnit} onValueChange={(value: "kelvin" | "celsius" | "fahrenheit") => {
                    setTempUnit(value);
                    // Force a re-render of the forecast chart
                    setForecastData([...forecastData]);
                  }} aria-label="Select temperature unit">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kelvin">Kelvin</SelectItem>
                    <SelectItem value="celsius">Celsius</SelectItem>
                    <SelectItem value="fahrenheit">Fahrenheit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">City</label>
                <Select value={selectedCity} onValueChange={(value) => {
                    setSelectedCity(value);
                    fetchForecastData(value);
                  }} aria-label="Select city">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(weatherData).map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Tabs defaultValue="summary" className="mb-6">
            <TabsList>
              <TabsTrigger value="summary">Daily Summary</TabsTrigger>
              <TabsTrigger value="historical">Historical Trends</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Weather Summary</CardTitle>
                  <CardDescription>Temperature, humidity, and wind speed summary for major Indian metros</CardDescription>
                </CardHeader>
                <CardContent>{renderDailySummary()}</CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="historical">
              <Card>
                <CardHeader>
                  <CardTitle>Historical Weather Trends</CardTitle>
                  <CardDescription>Temperature, humidity, and wind speed trends for major Indian metros</CardDescription>
                </CardHeader>
                <CardContent>{renderHistoricalTrends()}</CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="forecast">
              <Card>
                <CardHeader>
                  <CardTitle>Weather Forecast</CardTitle>
                  <CardDescription>Detailed weather forecast for {selectedCity}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {renderForecast()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <Card>
            <CardHeader>
              <CardTitle>Current Weather Conditions</CardTitle>
              <CardDescription>Current dominant weather conditions for each city</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(weatherData).map(([city, data]) => (
                  <div key={city} className="p-4 border rounded-lg">
                    <h3 className="font-semibold">{city}</h3>
                    <p>{data.dominant_weather}</p>
                    <p className="flex items-center mt-2">
                      <Droplets className="w-4 h-4 mr-1" />
                      Humidity: {data.humidity}%
                    </p>
                    <p className="flex items-center mt-1">
                      <Wind className="w-4 h-4 mr-1" />
                      Wind Speed: {data.wind_speed} m/s
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <h2 className="text-2xl font-bold mt-8 mb-4">Triggered Alerts</h2>
          {alerts.map((alert) => (
            <Alert key={alert.id} variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{alert.city} Alert</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </>
      )}
    </div>
  )
}