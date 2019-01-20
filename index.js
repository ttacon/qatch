#!/usr/bin/env node

const argv = require('yargs').argv;

//
// Handle, odd, uncaught exceptions.
//
process.once('uncaughtException', (err) => {
  console.error('\nOh no, something bad happened! :(');
  console.error(err);
  process.exit(1);
});

const {
  handleOptions,
  parseOptions
} = require('./src/main');

// There are two main functionalities:
//
//  - set profiling and truncate profiling collection
//  - identify and report slow queries
//
handleOptions(parseOptions(argv))
  .then((exitWithErr) => {
    process.exit(exitWithErr ? 1 : 0);
  })
  .catch((err) => {
    console.error('an error was encountered, displaying the error and then exiting');
    console.error(err);
    process.exit(1);
  });