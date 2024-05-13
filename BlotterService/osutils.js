import os from "os";

/**
 * Taken from os-utils https://github.com/oscmejia/os-utils/blob/master/lib/osutils.js
 * This message will execute the callback with the CPU usage as a parameter after one second
 * @param {*} callback
 * @param {*} free
 */
export function getCPUUsage(callback, free) {
    var stats1 = getCPUInfo();
    var startIdle = stats1.idle;
    var startTotal = stats1.total;

    setTimeout(function () {
        var stats2 = getCPUInfo();
        var endIdle = stats2.idle;
        var endTotal = stats2.total;

        var idle = endIdle - startIdle;
        var total = endTotal - startTotal;
        var perc = idle / total;

        if (free === true) callback(perc);
        else callback(1 - perc);
    }, 1000);
}

function getCPUInfo(callback) {
    var cpus = os.cpus();

    var user = 0;
    var nice = 0;
    var sys = 0;
    var idle = 0;
    var irq = 0;
    var total = 0;

    for (var cpu in cpus) {
        if (!cpus.hasOwnProperty(cpu)) continue;
        user += cpus[cpu].times.user;
        nice += cpus[cpu].times.nice;
        sys += cpus[cpu].times.sys;
        irq += cpus[cpu].times.irq;
        idle += cpus[cpu].times.idle;
    }

    var total = user + nice + sys + idle + irq;

    return {
        idle: idle,
        total: total,
    };
}
