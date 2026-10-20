const database = require('../config/db');
class OpenAIUsage {
  constructor(db=database){this.db=db;}
  async reserve({customerId,conversationId,model,amount,limit}){
    if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(limit)||limit<0)throw Object.assign(new Error('Invalid budget'),{code:'OPENAI_BUDGET_CONFIG'});
    const client=await this.db.pool.connect();
    try{
      await client.query('BEGIN');
      if (limit > 0) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('ftth-openai-budget'))");
      const total=await client.query("SELECT COALESCE(SUM(COALESCE(estimated_usd,reserved_usd)),0) total FROM assistant_api_usage WHERE billing_day=(NOW() AT TIME ZONE 'America/La_Paz')::date");
      if(Number(total.rows[0].total)+amount>limit)throw Object.assign(new Error('Daily budget reached'),{code:'OPENAI_DAILY_BUDGET'});
      }
      const row=await client.query('INSERT INTO assistant_api_usage(customer_id,conversation_id,model,reserved_usd) VALUES($1,$2,$3,$4) RETURNING id',[customerId||null,conversationId||null,model,amount.toFixed(6)]);
      await client.query('COMMIT');return row.rows[0].id;
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
  async settle(id,{usage,status='COMPLETED',errorCode=null,toolCostUsd=0}){
    // Full input rate is conservative: cached input discounts are not deducted.
    const cost=usage?Number(usage.input_tokens||0)*2/1e6+Number(usage.input_tokens_details?.cache_write_tokens||0)*0.5/1e6+Number(usage.output_tokens||0)*10/1e6+Math.max(0,Number(toolCostUsd)||0):null;
    await this.db.query('UPDATE assistant_api_usage SET estimated_usd=$2,status=$3,usage=$4::jsonb,error_code=$5,completed_at=NOW() WHERE id=$1 AND status=\'RESERVED\'',[id,status==='FAILED'?0:cost,status,JSON.stringify({...usage,tool_cost_usd:Math.max(0,Number(toolCostUsd)||0)}),errorCode]);
    return cost;
  }
}
module.exports={OpenAIUsage,usage:new OpenAIUsage()};
