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
  return users; // modify later
}).then((users) => {
  return createUserPromise(users);
}).then((promises) => {
  return Promise.all(promises);
}).then(() => {
  console.log('finish');
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

function formatStatusData(res) {
  const users = [];

  for (const user of res.status_list.status) {
    if (user.status[0] === 'Accepted') {
      users.push({
        userId        : user.user_id[0],
        memory        : user.memory[0],
        cputime       : user.cputime[0],
        codeSize      : user.code_size[0],
        problemId     : user.problem_id[0],
        submissionDate: user.submission_date[0]
      });
    }
 }

  return users;
}

// check in file
// function check

function createUserPromise(users) {
  const promises = [];

  for (let i = 0; i < 1; i++) { // for debug
    const user = users[i];
  // for (const user of users) {
    const promise = new Promise((resolve, reject) => {
      fetchData(`${problemApi}${user.problemId}`).then((res) => {
        resolve(res);

        const ranking = sortProblemList(res.problem.solved_list[0].user);

        // cputime
        if (checkRanking(ranking[0], user) <= 10) {
          console.log('ok');
        }

        // code_size
        if (checkRanking(ranking[1], user) <= 10) {
          console.log('ok');
        }
      });
    });
    promises.push(promise);
  }

  return promises;
}


function sortProblemList(list) {
  let cputimeRanking  = [];
  let codeSizeRanking = [];

  cputimeRanking = list.slice().sort((a, b) => {
    return a.cputime[0] - b.cputime[0];
  });

  codeSizeRanking = list.slice().sort((a, b) => {
    return a.code_size[0] - b.code_size[0];
  });

  return [cputimeRanking, codeSizeRanking];
}

function checkRanking(ranking, user) {
  let rank;

  ranking.find((e, i) => {
    if (e.id[0] === user.userId && e.submissiondate[0] === user.submissionDate) {
      rank = i;
      return true;
    }
  });

  return rank || null;
}
