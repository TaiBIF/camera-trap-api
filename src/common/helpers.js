const xmlbuilder = require('xmlbuilder');
const SpeciesModel = require('../models/data/species-model');
// const ProjectSpeciesModel = require('../models/data/project-species-model');
const SpeciesSynonyms = require('../models/const/species-synonyms');

exports.getDaysInMonth = year => {
  /* via:
     https://zh.wikipedia.org/zh-tw/闰年
  */
  let isLeapYear = false;
  if (year % 4 === 0 && year % 100 !== 0) {
    isLeapYear = true;
  } else if (year % 400 === 0) {
    isLeapYear = true;
  }
  return [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
};

exports.findSynonymSpecies = speciesIds =>
  SpeciesModel.where({
    _id: { $in: speciesIds },
  }).then(speciesList => {
    let synonyms = [];
    speciesList.forEach(species => {
      synonyms.push(species.title['zh-TW']);

      // found synonyms
      Object.entries(SpeciesSynonyms).forEach(([showName, sameNames]) => {
        const synonymList = [
          showName,
          ...(sameNames ? sameNames.split(';') : []),
        ];

        if (synonymList.indexOf(species.title['zh-TW']) >= 0) {
          synonyms = [...synonyms, ...synonymList];
        }
      });
    });

    return SpeciesModel.where({
      'title.zh-TW': { $in: synonyms },
    }).then(mappedSpeciesList => {
      const mappedSpeciesIds = mappedSpeciesList.map(species => species._id);
      return mappedSpeciesIds;
    });
  });

exports.createDwCA = (project, occurrenceData, tripData) => {
  const projectId = project._id.toString();

  // meta.xml
  let meta = xmlbuilder
    .create('archive', { headless: true })
    .att({
      xmlns: 'http://rs.tdwg.org/dwc/text/',
      metadata: 'eml.xml',
    })
    .ele('core', {
      encoding: 'UTF-8',
      fieldsTerminatedBy: ',',
      linesTerminatedBy: '\\n',
      fieldsEnclosedBy: '',
      ignoreHeaderLines: '1',
      rowType: 'http://rs.tdwg.org/dwc/terms/Occurrence',
    })
    .ele('files')
    .ele('location', {}, 'occurrence.txt')
    .up()
    .up()
    .ele('id', { index: 0 })
    .up()
    .ele('field', {
      index: '1',
      term: 'http://rs.tdwg.org/dwc/terms/occurrenceID',
    })
    .up()
    .ele('field', {
      index: '2',
      term: 'http://rs.tdwg.org/dwc/terms/basisOfRecord',
    })
    .up()
    .ele('field', {
      index: '3',
      term: 'http://rs.tdwg.org/dwc/terms/eventTime',
    })
    .up()
    .ele('field', { index: '4', term: 'http://rs.tdwg.org/dwc/terms/country' })
    .up()
    .ele('field', {
      index: '5',
      term: 'http://rs.tdwg.org/dwc/terms/countryCode',
    })
    .up()
    .ele('field', {
      index: '6',
      term: 'http://rs.tdwg.org/dwc/terms/verbatimElevation',
    })
    .up()
    .ele('field', {
      index: '7',
      term: 'http://rs.tdwg.org/dwc/terms/decimalLatitude',
    })
    .up()
    .ele('field', {
      index: '8',
      term: 'http://rs.tdwg.org/dwc/terms/decimalLongitude',
    })
    .up()
    .ele('field', {
      index: '9',
      term: 'http://rs.tdwg.org/dwc/terms/geodeticDatum',
    })
    .up()
    .ele('field', {
      index: '10',
      term: 'http://rs.tdwg.org/dwc/terms/vernacularName',
    })
    .ele('field', {
      index: '11',
      term: 'http://rs.tdwg.org/dwc/terms/scientificName',
    });

  if (tripData !== '') {
    meta = meta
      .up()
      .up()
      .ele('files')
      .ele('location', {}, 'event.txt')
      .up()
      .up()
      .ele('id', { index: 0 })
      .up()
      .ele('field', {
        index: '1',
        term: 'http://rs.tdwg.org/dwc/terms/eventID',
      })
      .up()
      .ele('field', {
        index: '2',
        term: 'http://rs.tdwg.org/dwc/terms/eventDate',
      })
      .up()
      .ele('field', {
        index: '3',
        term: 'http://rs.tdwg.org/dwc/terms/samplingMethod',
      });
  }

  meta = meta.up().end({ pretty: true });

  // eml.xml
  const CC_MAP = {
    by: 'CC-BY',
    cc0: 'CC0',
    'by-nc': 'BY-NC',
  };
  const ccLabel = project.interpretiveDataLicense
    ? CC_MAP[project.interpretiveDataLicense]
    : '';

  let eml = xmlbuilder
    .create('eml:eml', { headless: true })
    .att({
      'xmlns:eml': 'eml://ecoinformatics.org/eml-2.1.1',
      'xmlns:dc': 'http://purl.org/dc/terms/',
      'xmlns:xsi': 'ttp://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation':
        'eml://ecoinformatics.org/eml-2.1.1 http://rs.gbif.org/schema/eml-gbif-profile/1.1/eml.xsd',
      packageId: projectId,
      system: 'http://gbif.org',
      scope: 'system',
      'xml:lang': 'chi',
    })
    .ele('dataset')
    .ele('alternateIdentifier', {}, projectId)
    .up()
    .ele('title', { 'xml:lang': 'chi' }, project.title)
    .up()
    .ele('creator')
    .ele('individualName')
    .ele('surName', {}, project.principalInvestigator)
    .up()
    .up()
    .up()
    .ele('contact')
    .ele('individualName')
    .ele('surName', {}, project.principalInvestigator)
    .up()
    .up()
    .up()
    .ele('associatedParty')
    .ele('individualName')
    .ele('surName', {}, project.funder)
    .up()
    .up()
    .up()
    .ele('language', 'chi')
    .up()
    .ele('abstract')
    .ele('para', {}, project.description)
    .up()
    .up()
    .ele('intellectualRights');

  if (project.interpretiveDataLicense === 'cc0') {
    eml = eml
      .ele(
        'para',
        {},
        `To the extent possible under law, the publisher has waived all rights to these data and has dedicated them to the`,
      )
      .ele('ulink', {
        url: 'http://creativecommons.org/publicdomain/zero/1.0/legalcode',
      })
      .ele('citetitle', `Public Domain (${ccLabel})`)
      .up()
      .up()
      .text(
        '. Users may copy, modify, distribute and use the work, including for commercial purposes, without restriction.',
      );
  } else if (project.interpretiveDataLicense === 'by') {
    eml = eml
      .ele('para', {}, `This work is licensed under a`)
      .ele('ulink', {
        url: 'http://creativecommons.org/licenses/by/4.0/legalcode',
      })
      .ele('citetitle', `Creative Commons Attribution (${ccLabel}) 4.0 License`)
      .up()
      .text('.');
  } else if (project.interpretiveDataLicense === 'by-nc') {
    eml = eml
      .ele('para', {}, `This work is licensed under a`)
      .ele('ulink', {
        url: 'http://creativecommons.org/licenses/by-nc/4.0/legalcode',
      })
      .ele(
        'citetitle',
        `Creative Commons Attribution Non Commercial (${ccLabel}) 4.0 License`,
      )
      .up()
      .text('.');
  }

  eml = eml.end({ pretty: true });

  // options can refer to [http://archiverjs.com/zip-stream/ZipStream.html#entry](http://archiverjs.com/zip-stream/ZipStream.html#entry)
  const zipFiles = [
    {
      content: `\ufeff${occurrenceData}\n`, // csv add content with bom
      name: 'occurrence.txt',
      mode: '0755',
      date: new Date(),
      type: 'file',
    },
    {
      content: meta,
      name: 'meta.xml',
      mode: '0755',
      date: new Date(),
      type: 'file',
    },
    {
      content: eml,
      name: 'eml.xml',
      mode: '0755',
      date: new Date(),
      type: 'file',
    },
  ];

  if (tripData !== '') {
    zipFiles.push({
      content: tripData,
      name: 'event.txt',
      mode: '0755',
      date: new Date(),
      type: 'file',
    });
  }
  return zipFiles;
};
