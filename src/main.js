// @ts-check
/* eslint-disable */

// DO :: 전체 가문과 구성 캐릭터 가져오기

/**
 * @typedef Character
 * @property {string} slug
 */

/**
 * @typedef House
 * @property {string} slug
 * @property {Character[]} members
 */

const https = require('https');
const GOTAPI_PREFIX = 'https://game-of-thrones-quotes.herokuapp.com/v1';

/**
 * @returns {Promise<House[]>}
 */

async function getHouses() {
  return new Promise((resolve) => {
    https.get(`${GOTAPI_PREFIX}/houses`, (res) => {
      let jsonStr = '';
      res.setEncoding('utf-8');
      res.on('data', (data) => (jsonStr += data));
      res.on('end', () => resolve(JSON.parse(jsonStr)));
    });
  });
}

async function main() {
  const houses = await getHouses();
  console.log(houses);
}

main();
