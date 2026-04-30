import axios from 'axios';

axios.get('http://localhost:8080/pilots')
  .then(res => {
    console.log(JSON.stringify(res.data[0], null, 2));
  })
  .catch(err => {
    console.error(err.message);
  });
