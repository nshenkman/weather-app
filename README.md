# Weather App

This is a simple weather emailing application that allows people to subscribe to a daily weather email notification. The app consists of two parts. One part is the client side which has an AngularJS frontend with a Node.js backend. The frontend is a single page app that has two form fields, email and city. All subscribed emails must be unique and there can only be one city to one email. The [Wunderground API](https://www.wunderground.com/weather/api/d/docs "Title") is used to search for cities and deliver forecast information. The backend is responsible for checking whether an email already exists, creating and deleting accounts and grabbing the cities and forecast from the Wunderground API. The cities are limited to US cities only. The second part is the sending email script (sendEmails.js) which is responsible for finding accounts that have not successfully received an email in the last 24 hours, getting the forecasts for the cities connected to the account and sending the email. A log is recorded for each email that tries to get sent. If sending the email was unsuccessful, it will try to send the email again the next time the script is called.


### How to use weather-app locally
1. Clone weather-app
2. Run `npm install`
3. Make sure MySQL is installed on your local machine
4. Run `mysql < weather_app.sql`
5. Run `NODE_ENV=local WUNDERGROUND_API_KEY=your_wunderground_api_key node app.js`
6. Your app should be running on `localhost:3000`

### Running the app
run `NODE_ENV=local WUNDERGROUND_API_KEY=your_wunderground_api_key node app.js`

### Running the email script
Run `NODE_ENV=local WUNDERGROUND_API_KEY=your_wunderground_api_key EMAIL=your_email_to_send_from PASS=your_email_password EMAIL_SERVICE=email_service_provider node sendEmails.js`

### Running in production
Same steps as running the app and email script but a DB_HOST, DB_USER, DB_PASS and DOMAIN (for the unsubscribe link) must be provided.

### Running tests
Run `npm test`

### API Endpoints
##### Accounts
Responsible for creating and deleting accounts as well as checking if an email exists
* **Endpoints**
POST /api/account
GET /api/account/unsubscribe
GET /api/email-check
*  **URL Params**
For GET /api/account/unsubscribe
`email=[String]`
The email to unsubscribe
For GET /api/email-check
`email=[String]`
The email to check if it is already subscribed
* **Data Params**
For POST /api/account:
`{"email":[String], "locationLink":[String], "locationName":[String]}`

email : An email to send the forecast to.

locationLink : A wunderground enpoint that coresponds to a city in their API e.g.`/q/zmw:02108.1.99999`.

locationName : The name of the city matching the locationLink City
* **Error Response :**

  For POST /api/account
    * **Code:** 409 CONFLICT
    * Given email already exists
    * **Code:** 400 BAD REQUEST
    * Missing parameters in request
    * **Code:** 500 INTERNAL SERVER ERROR
    * Internal Server Error

  For GET /api/account/unsubscribe
    * **Code:** 404 NOT FOUND
    * **Content:** `{"status" : "failed" : "reason" : "Email not found"}`
    * **Code:** 400 BAD REQUEST
    * **Content:** `{"status" : "failed" : "reason" : "Email parameter missing"}`
    * **Code:** 500 INTERNAL SERVER ERROR
    * **Content:** `{"status" : "failed" : "reason" : "Internal server error"}`

##### Wunderground
Responsible for getting cities from the Wunderground API
* **Endpoints**
GET /api/cities
*  **URL Params**
`query=[String]`
the query to use to search for cities e.g. Bosto
* **Successful Response:**
Please refer to the [Wunderground Docs](https://www.wunderground.com/weather/api/d/docs?d=autocomplete-api "Title") for responses.
* **Error Response :**
  * **Code:** 500 SERVICE UNAVAILABLE
  * Error from the Wunderground API
  * **Code:** 500 INTERNAL SERVER ERROR
  * Internal Server Error

### Example in use
[Here](https://klaviyo-weather-app.herokuapp.com/ "Title")




