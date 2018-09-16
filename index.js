const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Welcome to Carmonic'));

app.get('/getMechanics', (req, res) => res.send({'mechanicId':'0','latitude':'0','longitude':'0'}));

app.listen(3000, () => console.log('Example app listening on port 3000!'));
