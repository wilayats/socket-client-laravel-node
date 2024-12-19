const {isAgentOnline} = require("./Helper");
const {setCache, getCache} = require("./RedisConnection");
const moment = require("moment");
let onlineAgents = [
    /*{
        agentId: 3001,
        agentName: "agent 3001",
        agentStatus: "Connected"
    },
    {
        agentId: 3002,
        agentName: "agent 3002",
        agentStatus: "Connected"
    }*/
];
/*  {agentId:3001,agentName:"any name",} */
const socketConnection = async (io) => {
    /*io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (token ==='tokentoken'){
            next();
        } else {
            next(new Error("Socket authentication error"));
        }
    });*/
    await io.on('connection', (socket) => {
        socket.on('userRegister', (agent) => {

            console.log(agent)

            agent = (JSON.parse(agent) !== undefined) ? JSON.parse(agent) : {};
            if (Object.keys(agent).length > 0 && !isNaN(agent.agentId)) {
                const agentId = Number(agent.agentId)
                socket.agentId = agentId
                socket.agentArmId = agent.agentArmId
                getCache('getRegisterUsers').then((results) => {
                    if (results !== undefined && results !== null && results.length > 0) {
                        onlineAgents = JSON.parse(results)
                        let agentKey = isAgentOnline(onlineAgents, agentId)
                        if (agentKey === -1) {
                            onlineAgents.push({
                                ...agent,
                                agentId: agentId,
                                agentArmId: agent.agentArmId,
                                agentUnique: agent.agentUnique,
                                loginAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                                status: agent.status ?? '',
                                isLogin: agent.isLogin
                            })
                        } else {
                            const prevAgentUnique = onlineAgents[agentKey].agentUnique;
                            console.log(prevAgentUnique, 'agentUnique');
                            io.emit(`agent_${prevAgentUnique}`, agent.agentUnique);
                            onlineAgents[agentKey] = {
                                ...agent,
                                agentId: agentId,
                                loginAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                                status: agent.status ?? '',
                                isLogin: agent.isLogin,
                                agentUnique: agent.agentUnique,
                                agentArmId: agent.agentArmId,
                            }
                        }
                        (async () => {
                            await setCache(`getRegisterUsers`, onlineAgents);
                            io.emit('getRegisterUsers', JSON.stringify(onlineAgents)) /* channel for receiving data on client slide */
                        })();
                    } else {
                        (async () => {
                            await setCache(`getRegisterUsers`, [{
                                ...agent,
                                agentId: agentId,
                                loginAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                                status: agent.status ?? '',
                                isLogin: agent.isLogin,
                                agentArmId: agent.agentArmId,
                            }]);
                            io.emit('getRegisterUsers', JSON.stringify(onlineAgents)) /* channel for receiving data on client slide */
                        })();
                    }
                })
            }
        })
        socket.on('agentDisconnected', function (agentId) {
            getCache('getRegisterUsers').then((results) => {
                if (results !== undefined && results !== null && results.length > 0) {
                    onlineAgents = JSON.parse(results)

                    let agentKey = isAgentOnline(onlineAgents, agentId);
                    if (agentKey !== -1) {
                        onlineAgents.splice(agentKey, 1)
                    }
                    (async () => {
                        await setCache(`getRegisterUsers`, onlineAgents);
                        io.emit('getRegisterUsers', JSON.stringify(onlineAgents)) /* channel for receiving data on client slide */
                    })();
                }
            });
        })

        socket.on('disconnect', () => {
            if (socket.agentId !== undefined) {
                const agentId = Number(socket.agentId);

                getCache('getRegisterUsers').then((results) => {
                    if (results !== undefined && results !== null && results.length > 0) {
                        onlineAgents = JSON.parse(results)
                        let agentKey = isAgentOnline(onlineAgents, agentId)

                        if (agentKey !== -1) {
                            onlineAgents.splice(agentKey, 1)
                        }
                        (async () => {
                            await setCache(`getRegisterUsers`, onlineAgents);
                            io.emit('getRegisterUsers', JSON.stringify(onlineAgents)) /* channel for receiving data on client slide */
                        })();
                    }
                });
            }
        })

        /*  socket.on('hangup_call_event', (data) => {
              console.log(data,'hangup_call_event')
              try{
                  data = JSON.parse(data)
                  const callResponse = {
                      ringing: false,
                      outgoing: false,
                      phoneNumber: data.phoneNumber,
                      agentUser: data.agentUser,
                      status: data.event,
                      hangupBy: data.hangupBy,
                      action: data.event
                  };
                  io.emit(`agent_${data.agentUser}`, JSON.stringify(callResponse))
              }catch (e) {

              }
              console.log(data, 'DATA')
          })*/

        socket.on('transferCall', (data) => {
            data = JSON.parse(data)
            const {agentId, channel, transferAgent} = data
            /* console.log(agentId, channel, 'chanel transfer call')*/
            ASTERISKAPI.action({
                action: 'BlindTransfer',
                channel: channel,
                context: 'from-internal',
                exten: agentId
            }, (err, response) => {
                if (err) {
                    ioModule.emit(`agent_transfer_${transferAgent}`, JSON.stringify({
                        message: `Error occur while transfer call!`,
                        type: 'error',
                        agentId: agentId,
                        transferAgent: transferAgent,
                        response: JSON.stringify(response)
                    }))
                    console.log(err)
                } else {
                    ioModule.emit(`agent_transfer_${transferAgent}`, JSON.stringify({
                        message: `Call transfer to ${agentId} successfully!`,
                        type: 'success',
                        agentId: agentId,
                        transferAgent: transferAgent,
                        response: JSON.stringify(response)
                    }))
                }
            })

        })

        socket.on("hangupAgentCall", (data) => {
            /*console.log(data,'HangupAgentCall')*/
            data = JSON.parse(data)
            const {channel, distChannel, agentId} = data
            ASTERISKAPI.action({
                action: 'Hangup',
                actionID: Math.random(10000000, 9999999999),
                channel: channel,
                cause: 10
            }, (err, response) => {
                /*console.log(err,response,'Error Response')*/
                if (err) {
                    if (distChannel) {
                        ASTERISKAPI.action({
                            action: 'Hangup',
                            actionID: Math.random(10000000, 9999999999),
                            channel: distChannel,
                            cause: 10
                        }, (err1, response1) => {
                            if (err1) {
                                ioModule.emit(`agent_hangup_${agentId}`, JSON.stringify({
                                    message: 'Error occur !',
                                    type: 'error'
                                }))
                            } else {
                                ioModule.emit(`agent_hangup_${agentId}`, JSON.stringify({
                                    message: 'Call Hangup Successfully',
                                    type: 'success'
                                }))
                            }
                        });
                    }
                } else {
                    ioModule.emit(`agent_hangup_${agentId}`, JSON.stringify({
                        message: 'Call Hangup Successfully',
                        type: 'success'
                    }))
                }
            });
        })

        socket.on('agent_call_data', (data) => {
            if (data !== undefined && data !== null) {
                const newData = JSON.parse(data);
                const agentId = newData.agentId;
                newData.currentAgent = agentId;
                let results = [];
                // return ;
                const d = new Date();
                const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                const dd = `${d.getFullYear()}_${months[d.getMonth()]}_${d.getDate()}`
                console.log(d, dd, 'date')
                getCache(`asterisk_calls_${dd}`).then((results) => {
                    if (results !== undefined && results !== null && results.length > 0) {
                        try {
                            results = JSON.parse(results)
                            results.push(newData);
                            setCache(`asterisk_calls_${dd}`, results).then((ressss) => {
                                console.log('added!')
                            })
                        } catch (e) {

                        }
                    } else {
                        setCache(`asterisk_calls_${dd}`, [newData]).then((ressss) => {
                            console.log('added!')
                        })
                    }
                })
                //ProcessAgentDataJob(newData,mysqlConnect);
                return;
            }
        })
    })
    return io
}

const agentsScreens = (screens, agentId, newScreenUniqueId) => {
    let newScreenIds = [];
    screens.map((screenId,i)=>{
        const ii = screeExist(screens,screenId);
        if (ii !==-1){
            newScreenIds.push(newScreenUniqueId);
        }
    })
    return newScreenIds;
}
const screeExist = (screens, value) => {
    let index = -1;
    screens.map((screen, i) => {
        if (screen == value) {
            index = i;
        }
    })
    return index;
}
module.exports.socketConnection = socketConnection;