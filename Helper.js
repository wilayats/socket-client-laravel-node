const isAgentOnline  = (agents,agentId) => {
    let flag = -1;
    agents.map((agent,key)=> {
        if (agent.agentId === agentId){
            flag =  key;
        }
    })
    return flag;
}
const createLog =  (fileName,data=[]) => {
    const fs = require("fs");
    fs.writeFile(fileName, JSON.stringify(data), (err,res) => {
        if(err) console.log(err);
        console.log(res);
    });
}

module.exports = {
    isAgentOnline,
    createLog
}