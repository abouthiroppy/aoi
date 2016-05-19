'use strict';

const http        = require('http');
const parseString = require('xml2js').parseString;

/**
 * @description AOJ API
 */
const statusApi  = 'http://judge.u-aizu.ac.jp/onlinejudge/webservice/status_log';
const problemApi = 'http://judge.u-aizu.ac.jp/onlinejudge/webservice/problem?id=';

Promise.resolve().then(() => {
  return fetchData(statusApi);
}).then((res) => {
  return formatStatusData(res);
}).catch((err) => {
  console.error(err);
}).then((users) => {

  // check users
  // return fetchData();
}).then(() => {
});

function fetchData(uri) {
  return new Promise((resolve, reject) => {
    http.get(uri, (res) => {
      let chunk = '';
      res.setEncoding('utf8');
      res.on('data', (str) => {
        chunk += str;
      });

      res.on('end', () => {
        parseString(chunk, {trim: true}, (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// [TODO]
function formatStatusData(res) {
  const users = [];

  for (const data of res.status_list.status) {
    users.push({
      userId        : data.user_id[0],
      memory        : data.memory[0],
      cputime       : data.cputime[0],
      codeSize      : data.code_size[0],
      problemId     :data.problem_id[0],
      submissionDate:data.submission_date[0]
    });
 }

  return users;
}

// function check
