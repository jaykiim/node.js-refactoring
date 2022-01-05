// @ts-check
/* eslint-disable */

/**
 * @typedef Character
 * @property {string} house
 * @property {string} slug
 * @property {string} quote
 * @property {number} polarity
 */

/**
 * @typedef House
 * @property {string} slug
 * @property {Character[]} members
 */

const https = require('https');
const GOTAPI_PREFIX = 'https://game-of-thrones-quotes.herokuapp.com/v1';

// GUIDE JSON 응답 받아주는 함수
/**
 * @param {string} url
 * @returns {Promise<*>}
 */
async function getHttpsJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let jsonStr = '';
      res.setEncoding('utf-8');
      res.on('data', (data) => (jsonStr += data));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(jsonStr);
          resolve(parsed);
        } catch {
          reject(
            new Error('The server response was not a valid JSON document.')
          );
        }
      });
    });
  });
}

// GUIDE 모든 가문 정보 가져오는 함수
/**
 * @returns {Promise<House[]>}
 */
async function getHouses() {
  return getHttpsJSON(`${GOTAPI_PREFIX}/houses`);
}

// GUIDE 대사 세니타이징
/**
 * @param {string} quote
 * @returns {string}
 */
function sanitizeQuote(quote) {
  return quote.replace(/[^a-zA-Z0-9., ]/g, '');
}

// GUIDE 멤버별 대사
/**
 * @param {string} slug
 * @returns {Promise<string>}
 */
async function getQuotesOfMember(slug) {
  const member = await getHttpsJSON(`${GOTAPI_PREFIX}/character/${slug}`);
  return sanitizeQuote(member[0].quotes.join(' '));
}

/**
 * @param {string} quote
 */
async function getSentimAPIResult(quote) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text: quote,
    });

    const postReq = https.request(
      {
        hostname: 'sentim-api.herokuapp.com',
        method: 'POST',
        path: '/api/v1/',
        headers: {
          Accept: 'application/json; encoding=utf-8',
          'Content-Type': 'application/json; encoding=utf-8',
          'Content-Length': body.length,
        },
      },
      (res) => {
        let jsonStr = '';
        res.setEncoding('utf-8');
        res.on('data', (data) => (jsonStr += data));
        res.on('end', () => {
          try {
            resolve(JSON.parse(jsonStr));
          } catch {
            reject(
              new Error('The server response was not a valid JSON document.')
            );
          }
        });
      }
    );

    postReq.write(body);
  });
}

/**
 * @param {number[]} numbers
 * @returns {number}
 */
function sum(numbers) {
  return numbers.reduce((memo, curr) => memo + curr, 0);
}

/*
===============================================================================================================
// TODO MAIN ==================================================================================================
===============================================================================================================
*/

async function main() {
  const houses = await getHouses();

  const members = await Promise.all(
    houses
      .map((house) =>
        house.members.map((member) =>
          getQuotesOfMember(member.slug).then((quote) => ({
            house: house.slug,
            slug: member.slug,
            quote,
          }))
        )
      )
      .flat()
  );

  const membersWithPolarity = await Promise.all(
    members.map(async (character) => {
      const result = await getSentimAPIResult(character.quote);
      return {
        ...character,
        polarity: result.result.polarity,
      };
    })
  );

  /** @type {Object.<string, Character[]>} */
  const memsByHouseSlugs = {};
  membersWithPolarity.forEach((mem) => {
    memsByHouseSlugs[mem.house] = memsByHouseSlugs[mem.house] || [];
    memsByHouseSlugs[mem.house].push(mem);
  });

  const houseSlugs = Object.keys(memsByHouseSlugs);
  const result = houseSlugs
    .map((houseSlug) => {
      const members = memsByHouseSlugs[houseSlug];
      const sumPolarity = sum(members.map((mem) => mem.polarity));
      const averagePolarity = sumPolarity / members.length;

      return [houseSlug, averagePolarity];
    })
    // @ts-ignore
    .sort((a, b) => a[1] - b[1]);

  console.log(result);
}

main();
