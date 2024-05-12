import { getCPUUsage } from "./osutils.js";
import os from "os";

export default class EventManager {
    constructor(kafkaProducer, machineId = Math.random() * 100000000000) {
        this.producer = kafkaProducer;
        this.machineId = machineId;
        console.log("This machine id: " + this.machineId);
    }

    async sendEvent(poolid, eventid, eventkey, eventvalue) {
        try {
            const fullMsg = {
                schema: {
                    type: "struct",
                    name: "event",
                    fields: [
                        {
                            field: "poolid",
                            type: "string",
                        },
                        {
                            field: "eventid",
                            type: "int64",
                        },
                        {
                            field: "machineid",
                            type: "int64",
                        },
                        {
                            field: "eventkey",
                            type: "string",
                        },
                        {
                            field: "eventvalue",
                            type: "float",
                        },
                        {
                            field: "timestamp",
                            type: "int64",
                        },
                    ],
                },
                payload: {
                    poolid,
                    machineid: this.machineId,
                    eventid,
                    eventkey,
                    eventvalue,
                    timestamp: Date.now(),
                },
            };
            const msg = {
                // key: poolid,
                value: JSON.stringify(fullMsg),
            };
            console.log("SENDING", msg)
            await this.producer.send({
                topic: process.env.OBSERVABILITY_EVENTS_TOPIC,
                messages: [
                    msg
                ],
            });
        } catch (error) {
            console.error(`Error publishing message: ${error}`);
        }
    }

    /**
     * To calculate CPU usage we need to ask the OS for two data points and calculate
     * the usage by finding the difference. This method will send the CPU usage after one second
     * @param {*} poolId
     */
    async send1SecondCPUUsage(poolId) {
        getCPUUsage((perc) => {
            this.sendEvent(poolId, Math.random() * 100000000000, "CPU_Usage", perc * 100);
        });
    }

    async sendMemoryUsage(poolId) {
        this.sendEvent(poolId,Math.random() * 100000000000, "Memory_Usage", (1 - os.freemem() / os.totalmem()) * 100);
    }
}