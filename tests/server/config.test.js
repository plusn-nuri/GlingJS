"use strict";

const config = require('../../demo/config');

describe("Config", ()=>{
    it("Has connection string",()=>{
        expect(config.connection).toBeDefined();
    })
    it("Has listener array",()=>{
        expect(config.listeners[0]).toBeDefined();
    })
    
})