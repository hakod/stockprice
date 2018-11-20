/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
      MongoClient.connect(CONNECTION_STRING,(err,db)=>{
        if (err){
          console.log(err)
        }
        let coll = db.collection('stockData')
        let stock = req.query.stock
        let like = req.query.like
        let ip = req.headers['x-forwarded-for']?req.headers['x-forwarded-for'].slice(0,12):"";
        let urr = 'https://api.iextrading.com/1.0/stock/'+stock+'/quote'
        
        function httpGetAsync(theUrl, callback)
        {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
        }
        xmlHttp.open("GET", theUrl, true); // true for asynchronous 
        xmlHttp.send(null);
        }
        if (!Array.isArray(stock)){
        httpGetAsync(urr,(data)=>{
          let dat = JSON.parse(data)
          
          coll.findOne({stock: dat.symbol},(err,doc)=>{
          if(!doc){            
            coll.insert({stock: dat.symbol, likes: like==undefined?0:1, ip: like==undefined?[]:[ip]})
            coll.findOne({stock: dat.symbol},(err,doc)=>{            
            res.json({stockData:{stock: dat.symbol, price: dat.latestPrice, likes: doc.likes}}) 
            })
          } else {
            if (doc && like!==undefined && doc.ip.includes(ip)==false) {            
            coll.findOneAndUpdate({stock: dat.symbol},{$inc:{"likes": 1},$push:{ip:ip}})
            coll.findOne({stock: dat.symbol},(err,doc)=>{          
              res.json({stockData:{stock: dat.symbol, price: dat.latestPrice, likes: doc.likes}}) 
            })} else {
              coll.findOne({stock: dat.symbol},(err,doc)=>{          
              res.json({stockData:{stock: dat.symbol, price: dat.latestPrice, likes: doc.likes}})
            })  
            }
              //return
              
            } 
              
            
          }
          )
          
        })
        }        
        if (Array.isArray(stock)){
         let urr1 = 'https://api.iextrading.com/1.0/stock/'+stock[0]+'/quote'
         let urr2 = 'https://api.iextrading.com/1.0/stock/'+stock[1]+'/quote'
         
         coll.findOne({stock:stock[1].toUpperCase()},(err,doa)=>{
         if (doa && like!==undefined && doa.ip.includes(ip)==false){
           coll.findOneAndUpdate({stock: stock[1].toUpperCase()},{$inc:{"likes": 1},$push:{ip:ip}})
         }  
         httpGetAsync(urr1,(data)=>{
           let ke = {stockData:[]}
           let dat = JSON.parse(data)
           let hold;
           coll.findOne({stock:dat.symbol},(err,doc)=>{
             if (doc && like!==undefined && doc.ip.includes(ip)==false){
               coll.findOneAndUpdate({stock: stock[0].toUpperCase()},{$inc:{"likes": 1},$push:{ip:ip}})
               }  
             let gl = doc.likes             
             hold = {stock:dat.symbol,price: dat.latestPrice, rel_likes: gl-doa.likes}
           ke.stockData.push(hold)
           
           httpGetAsync(urr2,(data)=>{
             let dat = JSON.parse(data)
             coll.findOne({stock:dat.symbol},(err,doc)=>{
                hold = {stock:dat.symbol,price: dat.latestPrice, rel_likes: doc.likes-gl}
                ke.stockData.push(hold)
                res.json(ke)
             })
            
           })
           })
           
         })
         })
         
        }        
           
      })
    });
    
};
