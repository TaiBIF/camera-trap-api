module.exports = function(app) {
  // 這是一時權宜，實際運作開大小圖要從前端設定
  app.get('/images/*', function(req, res) {
    //res.send('pong');
    res.redirect('https://s3-ap-northeast-1.amazonaws.com/camera-trap' + req.originalUrl.replace(/\/orig\//, '/512q60/').replace(/.jpg$/i, ".webp"));
  });
}
