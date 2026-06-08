const path = require('path');
const express = require('express');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
