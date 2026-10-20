const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {calculateTicketPriority}=require('../src/services/TicketPriorityService');
test('economic amounts cannot change priority for any category or failure',()=>{
 for(const category of ['HOGAR','NEGOCIO','INSTITUCION'])for(const code of ['ELECTRICAL_STORM_DAMAGE','SIN_INTERNET','INTERNET_LENTO']){
 const input={diagnosisCode:code,text:'Falla del servicio',customer:{customer_category:category,category_verified:true}};
 const expected=calculateTicketPriority(input);
 for(const fee of [0,100,999999999])assert.deepEqual(calculateTicketPriority({...input,customer:{...input.customer,monthly_fee_bob:fee},facts:{monthly_fee_bob:fee}}),expected);
 }
});
test('active queue and service identity do not read economic columns',()=>{
 for(const file of ['models/Ticket.js','models/User.js','services/ServiceIdentity.js','services/CustomerProfileSupport.js','controllers/ConversationController.js','controllers/TicketController.js']){
 assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname,'../src',file),'utf8'),/monthly_fee|monthlyFee|serviceMonthlyFee|hasVerifiedFee/,file);
 }
});
