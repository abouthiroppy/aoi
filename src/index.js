'use strict';

const fs          = require('fs');
const http        = require('http');
const Twitter     = require('twitter');
const parseString = require('xml2js').parseString;

/**
 * @description AOJ API
 */
const statusApi  = 'http://judge.u-aizu.ac.jp/onlinejudge/webservice/status_log';
const problemApi = 'http://judge.u-aizu.ac.jp/onlinejudge/webservice/problem?id=';

const client = new Twitter({
  'consumer_key'       : process.env['TWITTER_CONSUMER_KEY'],
  'consumer_secret'    : process.env['TWITTER_CONSUMER_SECRET'],
  'access_token_key'   : process.env['TWITTER_ACCESS_TOKEN_KEY'],
  'access_token_secret': process.env['TWITTER_ACCESS_TOKEN_SECRET']
});

const currentDateFile = 'current-date.txt';

let currentDate = null;

Promise.resolve().then(() => {

  // [TODO] ファイルがなかったら作るように変更
  return readCurrentDate();
}).then((date) => {
  currentDate = date;

  return fetchData(statusApi);
}).then((res) => {

  return formatStatusData(res);
}).catch((err) => {
  console.error(err);
}).then((users) => {

  return checkUsers(users);
}).then((users) => {
  if (users.length !== 0) {
    currentDate = users[0].submissionDate;
  }

  return createUserPromise(users);
}).then((promises) => {

  return Promise.all(promises);
}).then(() => {

  return writeCurrentDate(currentDate);
}).catch((err) => {
  console.error(err);
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
        id            : user.user_id[0],
        memory        : user.memory[0],
        cputime       : user.cputime[0],
        codeSize      : user.code_size[0],
        language      : user.language[0],
        problemId     : user.problem_id[0],
        submissionDate: user.submission_date[0]
      });
    }
  }

  return users;
}

function checkUsers(users) {
  return new Promise((resolve, reject) => {
    const res = [];

    for (let i = 0; i < users.length; i++) {
      if (currentDate === users[i].submissionDate) break;
      res.push(users[i]);
    }

    resolve(res);
  });
}

function createUserPromise(users) {
  const promises = [];

  for (const user of users) {
    const promise = new Promise((resolve, reject) => {
      fetchData(`${problemApi}${user.problemId}`).then((res) => {
        const problemId   = res.problem.id[0];
        const problemName = res.problem.name[0];

        const ranking = sortProblemList(res.problem.solved_list[0].user);

        const cputimeRanking  = checkRanking(ranking[0], user);
        const codeSizeRanking = checkRanking(ranking[1], user);

        const userSet = {
          id         : user.id,
          cputime    : user.cputime,
          codeSize   : user.codeSize,
          language   : user.language,
          problemId  : problemId,
          problemName: problemName
        };

        // cputime
        if (cputimeRanking !== null && cputimeRanking <= 10) {
          const tweet = createTweetText(Object.assign({}, userSet, {
            type: 'cputime',
            rank: cputimeRanking
          }));

          postToTwitter(tweet);
          console.log('cputime', cputimeRanking);
        }

        // code_size
        if (codeSizeRanking !== null && codeSizeRanking <= 10) {
          const tweet = createTweetText(Object.assign({}, userSet, {
            type: 'code_size',
            rank: cputimeRanking
          }));

          postToTwitter(tweet);
          console.log('code_size', codeSizeRanking);
        }

        resolve(res);
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
    if (e.id[0] === user.id && e.submissiondate[0] === user.submissionDate) {
      rank = i + 1;
      return true;
    }
  });

  return rank || null;
}

function readCurrentDate() {
  return new Promise((resolve, reject) => {
    fs.readFile(currentDateFile, 'utf8', (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });
}

function writeCurrentDate(date) {
  return new Promise((resolve, reject) => {
    fs.writeFile(currentDateFile, date, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

function createTweetText(obj) {
  const str = `${obj.id}さんが${obj.problemId}-${obj.problemName}を\
  language ${obj.language}, cputime ${obj.cputime}(sec),\
  code_size ${obj.codeSize}Bで${obj.type}で${obj.rank}位に入りました!\
  http://judge.u-aizu.ac.jp/onlinejudge/description.jsp?id=${obj.problemId}`;

  return str;
}

function postToTwitter(text) {
  client.post('statuses/update', {status: text}, (error, tweet, response) => {
    if(error) throw error;
  });
}
