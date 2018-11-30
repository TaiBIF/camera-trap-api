const adminSet = new Set([
  'ProjectManager',
  'Researcher',
  'SysAdmin',
  'ProjectInitiator',
]);

module.exports = (roles = []) => roles.some(role => adminSet.has(role));
