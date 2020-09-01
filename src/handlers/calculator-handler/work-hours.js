const moment = require('moment');
require('twix');
const _ = require('underscore');

const { ObjectID } = require('mongodb');
const CameraLocationModel = require('../../models/data/camera-location-model');
const CameraLocationState = require('../../models/const/camera-location-state');
const AnnotationModel = require('../../models/data/annotation-model');

const fetchCameraLocations = async cameraLocationIds => {
  const cameraLocations = await CameraLocationModel.where({
    _id: { $in: cameraLocationIds },
  }).where({ state: CameraLocationState.active });

  return cameraLocations;
}; // generate table "cameraLocations" by _id and active

const getMonthRange = (startDate, endDate) => {
  const s = moment(startDate);
  const e = moment(endDate);

  const result = [];
  // check Invalid date before the startDate
  while (s.isBefore(e)) {
    result.push(s.format('YYYY-MM'));
    s.add(1, 'month'); // add 1 month on Invalidate
  }
  return result;
};

module.exports = async (req, res) => {
  const form = req.query;
  const { cameraLocationIds = [], startDateTime, endDateTime } = form; // create form including three variables
  const cameraLocations = await fetchCameraLocations(cameraLocationIds); // get cameraLocations
  console.log(cameraLocationIds);

  const userid = [];
  cameraLocationIds.forEach(stringId => {
    userid.push(new ObjectID(stringId));
  });

  console.log(userid);
  const timesTT = await AnnotationModel.aggregate([
    {
      $match: { cameraLocation: { $in: userid } },
    },

    {
      $sort: {
        time: -1.0,
      },
    },
    {
      $group: {
        _id: '$cameraLocation',
        starttimes: {
          $first: {
            $arrayElemAt: ['$rawData', 4.0],
          },
        },
        endtimes: {
          $last: {
            $arrayElemAt: ['$rawData', 4.0],
          },
        },
      },
    },
  ]);
  // console.log(timesTT)

  const timesArray = [];
  const totalTest = {};
  await timesTT.forEach(t => {
    const Start = moment(t.starttimes).format('YYYY-MM-DDTHH:mm:ss');
    const End = moment(t.endtimes).format('YYYY-MM-DDTHH:mm:ss');

    if (moment(End).isAfter(Start)) {
      const durationsT = moment(End).diff(Start);
      totalTest[t._id] = durationsT;

      // console.log(totalTest)

      timesArray.push({
        id: t._id,
        start: Start,
        end: End,
      });
    } else {
      const durationsT = moment(Start).diff(End);
      totalTest[t._id] = durationsT;

      // console.log(totalTest)

      timesArray.push({
        id: t._id,
        start: End,
        end: Start,
      });
    }
  });

  const result = _.groupBy(timesArray, 'id');

  console.log(result);

  let dataT = [];
  if (form.range === 'month') {
    const monthList = getMonthRange(startDateTime, endDateTime);
    cameraLocations.forEach(c => {
      const workingCameraRange = result[c._id];
      monthList.forEach(m => {
        const beginT = moment(m).startOf('month');

        const endT = moment(m).endOf('month');

        let total = 0;

        workingCameraRange.forEach(({ start, end }) => {
          const range1 = moment(start).twix(end); // output the range from startTime to endTime
          const range2 = moment(beginT).twix(endT); // output the range from begin to end
          const rr = range1.intersection(range2); // get the overlap hour between range1 and range2
          const durationOne = rr._end.diff(rr._start);
          total += moment
            .duration(durationOne < 0 ? 0 : rr._end.diff(rr._start))
            .asHours();
        });
        dataT.push({
          cameraLocationId: c._id,
          workHours: parseFloat(total.toFixed(2)),
          month: moment(m).format('M'),
          year: moment(m).format('Y'),
        });
      });
    });
  } else {
    dataT = Object.keys(totalTest).map((v, i) => {
      const [cam] = result[v];

      return {
        cameraLocationId: cam.id,
        title: v,
        workHours: parseFloat(
          moment
            .duration(totalTest[v])
            .asHours()
            .toFixed(2),
        ),
      };
    });
    // console.log(dataT);
  }
  res.json(dataT);
};

/* const times = {};
  const totalTime = {};
  trips.forEach(t => {
    t.studyAreas.forEach(s => {
      s.cameraLocations.forEach(
        ({ cameraLocation: cameraLocationId, title, projectCameras }) => {
          //get startActiveDate and endActiveDate variables in projectCameras
          projectCameras.forEach(({ startActiveDate, endActiveDate }) => {
            //solve the condition with undefined in the type of times and totalTime
            if (typeof times[title] === 'undefined') {
              times[title] = [];
            }

            if (typeof totalTime[title] === 'undefined') {
              totalTime[title] = 0;
            }

            // startActiveDate: get the "有效開始工作時間" from the ProjectTrip.studyAreas.cameraLocations.cameraLocation, e.g.,:2017-05-03T03:48:00.000+0000
            // endActiveDate: 2017-06-30T00:23:00.000Z

            //create durarions variable from "endActiveDate - startActiveDate"
            const durations = moment(endActiveDate).diff(startActiveDate);
            totalTime[title] += durations;
            times[title].push({
              cameraLocationId,
              startTime: startActiveDate,
              endTime: endActiveDate,
            });
            //console.log(totalTime)
          });
        },
      );
    });
  });
  //console.log(times);




  let data = [];

  if (form.range === 'month') {
    const monthList = getMonthRange(startDateTime, endDateTime);
    cameraLocations.forEach(c => {
      const workingCameraRange = times[c.name];
      monthList.forEach(m => {
        const begin = moment(m).startOf('month');

        const end = moment(m).endOf('month');

        let total = 0;

        workingCameraRange.forEach(({ startTime, endTime }) => {
          const range1 = moment(startTime).twix(endTime); //output the range from startTime to endTime
          const range2 = moment(begin).twix(end); //output the range from begin to end
          //console.log(range2);


          const rr = range1.intersection(range2); // get the overlap hour between range1 and range2
          const duration = rr._end.diff(rr._start);
          total += moment
            .duration(duration < 0 ? 0 : rr._end.diff(rr._start))
            .asHours();
        });

        data.push({
          cameraLocationId: c._id,
          title: c.name,
          workHours: parseFloat(total.toFixed(2)),
          month: moment(m).format('M'),
          year: moment(m).format('Y'),
        });
      });
    });
  } else {

    data = Object.keys(totalTime).map((v, i) => {
      const [cam] = times[v];

      return {
        cameraLocationId: cam.cameraLocationId,
        title: v,
        workHours: parseFloat(
          moment
            .duration(totalTime[v])
            .asHours()
            .toFixed(2),
        ),
      };
    });
  }
  res.json(data);

};

/* output table

times: {
   YM03: [
     {
       cameraLocationId: 5f3f6984405af60035d645ec,
       startTime: 2017-05-03T03:48:00.000Z,
       endTime: 2017-06-30T00:23:00.000Z
     }
   ]
 } the startTime and endTime from the active start and end time

cam: {
   cameraLocationId: 5f3f6984405af60035d645ec,
   startTime: 2017-05-03T03:48:00.000Z,
   endTime: 2017-06-30T00:23:00.000Z
 }
 {
   cameraLocationId: 5f3defea0afc7e02901c64ee,
   startTime: 2017-04-28T12:59:00.000Z,
   endTime: 2017-05-17T02:32:00.000Z
 }

 trips: [
   {
     _id: 5f2a807c72cda4003b8cef6f,
     project: 5f2a78eb72cda4003b8cef1c,
     sn: 'YM',
     date: 2018-05-28T00:00:00.000Z,
     member: 'Vivian, Mike',
     studyAreas: [ [Object] ],
     createTime: 2020-08-05T09:48:44.958Z,
    updateTime: 2020-08-25T02:54:20.243Z,
     __v: 4
   }
 ]

form: {
   calculateTimeIntervel: '120000',
   cameraLocationIds: [ '5f3f6984405af60035d645ec' ],
   endDateTime: '2017-07-31T15:59:00.000Z',
   index: '1',
   projectIds: [ '5f2a78eb72cda4003b8cef1c' ],
   range: 'month',
   startDateTime: '2017-05-31T16:00:00.000Z'
 } startDateTime and endDateTime are from filtering



data: [
   {
     cameraLocationId: 5f3f6984405af60035d645ec,
     title: 'YM03',
     workHours: 0,
     month: '4',
     year: '2017'
   },
   {
     cameraLocationId: 5f3f6984405af60035d645ec,
     title: 'YM03',
     workHours: 692.2,
     month: '5',
     year: '2017'
   },....
   ]

begin: Moment {
   _isAMomentObject: true,
   _i: '2017-07',
   _f: 'YYYY-MM',
   _isUTC: false,
   _pf: {
     empty: false,
     unusedTokens: [],
     unusedInput: [],
     overflow: -1,
     charsLeftOver: 0,
     nullInput: false,
     invalidMonth: null,
     invalidFormat: false,
     userInvalidated: false,
     iso: true,
     parsedDateParts: [ 2017, 6 ],
     meridiem: undefined,
     rfc2822: false,
     weekdayMismatch: false
   },
   _locale: Locale {
     _calendar: {
       sameDay: '[Today at] LT',...
     },
     _longDateFormat: {
       LTS: 'h:mm:ss A',
       LT: 'h:mm A',...
     },
     _invalidDate: 'Invalid date',
     ordinal: [Function: ordinal],
     _dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
     _relativeTime: {
       future: 'in %s',
       past: '%s ago',...
     },
     _months: [
       'January',   'February',
       'March',     'April',
       'May',       'June',...
     ],
     _monthsShort: [
       'Jan', 'Feb', 'Mar',
       'Apr', 'May', 'Jun',..
     ],
     _week: { dow: 0, doy: 6 },
     _weekdays: [
       'Sunday',
       'Monday',..
     ],
     _weekdaysMin: [
       'Su', 'Mo',...
     ],
     _weekdaysShort: [
       'Sun', 'Mon',
       'Tue', 'Wed',...
     ],
     _meridiemParse: /[ap]\.?m?\.?/i,
     _abbr: 'en',
     _config: {
       calendar: [Object],
       longDateFormat: [Object],
       invalidDate: 'Invalid date',
       ordinal: [Function: ordinal],...
     },
     _dayOfMonthOrdinalParseLenient: /\d{1,2}(th|st|nd|rd)|\d{1,2}/
   },
   _a: [
     2017, 6, 1, 0,
        0, 0, 0
   ],
   _d: 2017-07-01T00:00:00.000Z,
   _isValid: true,
   _z: null
 }
 */
