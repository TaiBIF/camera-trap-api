module.exports = {
  emptyShot: 'empty-shot', // 空拍 (相機觸發，但影像中無拍攝到生物)
  test: 'test', // 測試 (研究人員安置相機時觸發拍攝之影像，抑或研究人員設置自動拍攝以測試相機運作之影像)
  human: 'human', // 人 (登山客、狩獵者等，非研究人員之人類),
  testShot: 'test-shot', //'定時測試'
  taskShot: 'task-shot', //'工作照',
  muntiacusReevesiMicrurus: 'muntiacus-reevesi-micrurus', // '山羌',
  rusaUnicolor: 'rusa-unicolor', //'水鹿',
  macacaCyclopis: 'macaca-cyclopis', //'獼猴',
  melogaleMoschata: 'melogale-moschata',// '鼬獾',
  naemorhedusSwinhoei: 'naemorhedus-swinhoei', //'山羊',
  susScrofaTaivanus: 'sus-scrofa-taivanus', //'野豬',
  rats: 'rats', //鼠類',
  pagumaLarvataTaivana: 'paguma-larvata-taivana', //白鼻心',
  lophuraSwinhoii: 'lophura-swinhoii', //藍腹鷴',
  herpestesUrva: 'herpestes-urva', //食蟹獴',
  dog: 'dog', //狗'
  all() {
    return [
      this.emptyShot,
      this.test,
      this.human,
      this.testShot,
      this.taskShot,
      this.muntiacusReevesiMicrurus,
      this.rusaUnicolor,
      this.macacaCyclopis,
      this.melogaleMoschata,
      this.naemorhedusSwinhoei,
      this.susScrofaTaivanus,
      this.rats,
      this.pagumaLarvataTaivana,
      this.lophuraSwinhoii,
      this.herpestesUrva,
      this.dog,
    ];
  },
};
