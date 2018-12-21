const md5 = require('md5');

module.exports = function(AbnormalData) {
  const getYearAndMonth = function(context, user, next) {
    const months = [
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
    ];

    const argsData = context.args.data;

    argsData.forEach((d, dIdx, arr) => {
      const abnormalMonthSpan = [];

      const startDateObj = new Date(`${d.abnormalStartDate} 00:00:00+8`);
      const endDateObj = new Date(`${d.abnormalEndDate} 00:00:00+8`);
      const startYear = startDateObj.getFullYear();
      const startMonth = `00${startDateObj.getMonth() + 1}`.substr(-2);
      const startDay = `00${startDateObj.getDate()}`.substr(-2);
      const startYearMonth = `${startYear}-${startMonth}`;

      const startDate = `${startYear}/${startMonth}/${startDay}`;

      const endYear = endDateObj.getFullYear();
      const endMonth = `00${endDateObj.getMonth() + 1}`.substr(-2);
      const endDay = `00${endDateObj.getDate()}`.substr(-2);
      const endYearMonth = `${endYear}-${endMonth}`;

      const endDate = `${endYear}/${endMonth}/${endDay}`;

      for (let y = startYear; y <= endYear; y += 1) {
        for (let mIdx = 0; mIdx < 12; mIdx += 1) {
          const m = months[mIdx];
          const yearMonth = `${y}-${m}`;
          if (yearMonth <= endYearMonth && yearMonth >= startYearMonth) {
            abnormalMonthSpan.push({ year: y, month: mIdx + 1 });
          }
        }
      }
      arr[dIdx].abnormalMonthSpan = abnormalMonthSpan;
      arr[dIdx].abnormalStartDate = startDate;
      arr[dIdx].abnormalEndDate = endDate;
      arr[dIdx].abnormalId = md5(
        `${d.fullCameraLocationMd5}:${startDate}:${endDate}`,
      );
    });

    next();
  };

  AbnormalData.beforeRemote('bulkInsert', getYearAndMonth);
  AbnormalData.beforeRemote('bulkReplace', getYearAndMonth);
};
