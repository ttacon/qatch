const {
  dbAndCollInfoFromNS,
} = require('../src/main');

describe('main', () => {
  describe('dbAndCollInfoFromNS', () => {
    test('should handle normal namespaces', () => {
      const { db, collection } = dbAndCollInfoFromNS('test.foo');
      expect(db).toBe('test');
      expect(collection).toBe('foo');
    });

    test('should handle dot delimited namespaces', () => {
      const { db, collection } = dbAndCollInfoFromNS('test.system.profile');
      expect(db).toBe('test');
      expect(collection).toBe('system.profile');
    });
  });
});