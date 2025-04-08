const db = require('./app/core/database.js');
const path = require('path');
const express = require('express');
const route = require('./app/routes');
const morgan = require('morgan');
const { engine } = require('express-handlebars'); // Sử dụng cú pháp mới
const app = express();
const port = 8080;

app.use(express.static(path.join(__dirname, 'public')));

db.query('SELECT * FROM users', (err, results) => {
  if (err) throw err;
  console.log(results);
});

//Route init
route(app);

app.use(morgan('combined'));
//Template engine
app.engine('hbs', engine({ extname: '.hbs' })); // Sử dụng engine thay vì handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'app/views'));

app.listen(port, () =>
    console.log(`App listening at http://localhost:${port}`),
);