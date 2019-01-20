const mongoist = require('mongoist');

// Default Mongo URI to default to.
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/test';

/**
 * @typedef Options
 *
 * @param {bool} begin Whether to enable profiling or not.
 * @param {bool} report Whether pull the query report or not.
 * @param {bool} clean If we should clean up the `system.profile` collection.
 * @param {string} mongoURI The Mongo connection URI to use.
 */

/**
 * Parses the given CLI options and sets a helpful default.
 *
 * @param {Object} argv The arguments parsed from the command line by yargs.
 * @returns {Options} The parsed qatch options.
 */
function parseOptions(argv) {
  const { begin, report, clean, mongoUri } = argv;
  return {
    begin,
    clean,
    mongoURI: mongoUri || DEFAULT_MONGO_URI,
    report
  };
}

/**
 * Handles the qatch invocation.
 *
 * @param {Options} options The invocation options.
 */
async function handleOptions({ begin, clean, mongoURI, report } = {}) {
  if (!begin && !report) {
    console.error('must provide either --begin or --report');
    throw new Error('invalid invocation');
  } else if (begin) {
    return setupProfiling(mongoURI, clean);
  } else {
    return reportProfiling(mongoURI, clean);
  }
}

/**
 * Enables profiling, and drops the current `system.profile` collection
 * if desired.
 *
 * @param {string} mongoURI The Mongo URI to use to connect.
 * @param {bool} clean If we should clean up `system.profile` before enabling
 *   profiling.
 */
async function setupProfiling(mongoURI, clean) {
  const db = mongoist(mongoURI);
  if (clean) resetAndDrop(db);
  await db.runCommand({
    profile: 2
  });
}

/**
 * Pulls the slow query report, if any. Also cleans up the `system.profile`
 * collection afterwards if desired.
 *
 * @param {string} mongoURI The Mongo URI to use to connect.
 * @param {bool} clean If we should clean up `system.profile` after pulling
 *   our report.
 */
async function reportProfiling(mongoURI, clean) {
  const db = mongoist(mongoURI);
  const queries = await db.collection('system.profile').find({
    op: {
      $in: [ 'query', 'update', 'remove' ]
    },
    ns: {
      $nin: [ /system\.profile/ ]
    },
    planSummary: {
      $nin: [ 'IDHACK', 'IXSCAN' ]
    }
  });

  report(queries);

  if (clean) await resetAndDrop(db);

  return !!queries.length;
}

/**
 * Resets the profiling level to zero asnd drops the existing `system.profile`
 * collection.
 *
 * @param {Object} db A reference to the DB handle.
 */
async function resetAndDrop(db) {
  await db.runCommand({
    profile: 0
  });

  const collectionNames = await db.getCollectionNames();
  if (!collectionNames.includes('system.profile')) return;

  await db.collection('system.profile').drop();
}

// Report generators for each `op` type.
const REPORTS = {
  'query': findReport,
  'remove': removeReport,
  'update': updateReport
};

/**
 * @typedef Query
 *
 * @param {Object} command The command that generated the query.
 * @param {string} ns The namespace that the query was run in.
 * @param {string} op The type of operation.
 */

/**
 * Generates the slow query report for the given queries.
 *
 * @param {Array<Query>} queries The queries to generate a report for.
 */
function report(queries) {
  const numQueries = queries.length;
  if (!numQueries) {
    console.log('No slow queries identified');
    return;
  }

  console.log(`Identified ${numQueries} slow quer${numQueries>1 ? 'ies' : 'y'}`);
  for ( const { command, ns, op } of queries ) {
    const { db, collection } = dbAndCollInfoFromNS(ns);
    console.log(`====================
OP:         ${op}
DB:         ${db}
COLLECTION: ${collection}
${REPORTS[op](command)}`);
  }
}

/**
 * @typedef ParsedNamespace
 *
 * @param {string} db The name of the DB that the query was run in.
 * @param {string} collection The name of the collection that the query was
 *   initiated on.
 */

/**
 * Extracts the DB and collection name from the given query namespace.
 *
 * @param {string} ns The namespace that the query was run in.
 * @returns {ParsedNamespace} The parsed namespace.
 */
function dbAndCollInfoFromNS(ns) {
  const [db, ...pieces] = ns.split('.');
  return {
    db,
    collection: pieces.join('.')
  };
}

/**
 * @typedef QueryCommand
 *
 * @param {Object} filter The filter that the query used.
 * @param {Object} projection (optional) The projection used with the query.
 */

/**
 * Generates the report for a find query.
 *
 * @param {QueryCommand} command The command to generate the report for.
 * @returns {string} The generated report for the command.
 */
function findReport(command) {
  const { filter, projection } = command;
  const builtFilter = `FILTER:     ${JSON.stringify(filter)}`;
  const builtProjection = `PROJECTION: ${JSON.stringify(projection)}`;
  return builtFilter + (projection ? `\n${builtProjection}` : '');
}

/**
 * @typedef UpdateCommand
 *
 * @param {Object} q The filter that the query used.
 * @param {Object} u The update that the query applied.
 * @param {bool} multi If the update was to be applied to multiple records.
 * @param {bool} upsert If the update was an upsert.
 */

/**
 * Generates the report for an update query.
 *
 * @param {UpdateCommand} command The command to generate the report for.
 * @returns {string} The generated report for the command.
 */
function updateReport(command) {
  const { q, u, multi, upsert } = command;
  return `FILTER:     ${JSON.stringify(q)}
UPDATE:     ${JSON.stringify(u)}
MUTLI:      ${multi}
UPSERT:     ${upsert}`;
}

/**
 * @typedef RemoveCommand
 *
 * @param {Object} q The filter that the query used. */

/**
 * Generates the report for a remove query.
 *
 * @param {RemoveCommand} command The command to generate the report for.
 * @returns {string} The generated report for the command.
 */
function removeReport(command) {
  const { q } = command;
  return `FILTER:     ${JSON.stringify(q)}`;
}

module.exports = {
  parseOptions,
  handleOptions,

  // for testing
  findReport,
  updateReport,
  removeReport,
  dbAndCollInfoFromNS,
  setupProfiling,
  reportProfiling,
  report
};