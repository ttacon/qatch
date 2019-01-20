# qatch
Slow query catcher

## Installation

```sh
npm i -g qatch
```

## Usage

### Initialize profiling

```sh
qatch --begin --mongo-uri=mongodb://localhost:27017/yolo
```

### Pulling a slow query profile

```sh
qatch --report --mongo-uri=mongodb://localhost:27017/yolo
```

## When to use

`qatch` is meant to be used to catch unexpected queries that aren't using Mongo
indices. A example usage would be to do something like the following as part of
your CI pipeline:

```sh
# Assuming that `qatch` in installed, initialize profiling.
qatch --begin --mongo-uri=mongodb://localhost:27017/yolo --clean

# Run your tests
npm run test

# Pull the report, if any slow queries are found, `qatch` will exit with a
# non-zero status code.
qatch --report --mongo-uri=mongodb://localhost:27017/yolo --clean
```

