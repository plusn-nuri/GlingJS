"use strict";
var ChangeType = require("../../src/changeType");
var Gling = require("../../src/gling");

describe("Gling", () => {

    const sampleOptions1 = {
        collecton: 'users',
        when: [ChangeType.create],
        filter: { number: { $mod: [3, 2] } },
        fields: ['name'],
        topic: 'user-registered'
    };

    it("Creates empty subscriptions", () => {
        expect(instance().subscriptions).toEqual([]);
    })


    describe("createDocumentFilter", () => {
        it("returns undefined if no filter specified", () => {
            var actual = instance().createDocumentFilter({});

            expect(actual).toBe(undefined);
        })

        it("returns $match if  filter present", () => {
            var actual = instance().createDocumentFilter({ filter: sampleOptions1.filter });

            expect(actual.$match['fullDocument.number']).toEqual(sampleOptions1.filter.number);
        })

    })

    describe("createProjection", () => {
        it("returns undefined if no fields specified", () => {
            var actual = instance().createProjection({ fields: null });

            expect(actual).toBe(undefined);
        })

        it("prepends field name with 'fullDocument.' if field didn't have it", () => {
            var actual = instance().createProjection({ fields: ['needsIt', 'fullDocument.alreadyGood'] });

            expect(actual).toEqual({ $project: { 'fullDocument.needsIt': 1, 'fullDocument.alreadyGood': 1 } });
        })

        it("returns projected fields for fields specified", () => {
            var actual = instance().createProjection({ fields: ['regular', 'foo[2].id'] });

            expect(actual).toEqual({ $project: { 'fullDocument.regular': 1, 'fullDocument.foo[2].id': 1 } });
        })
    })

    describe("createOpTypeFilter", () => {
        it("Adds match operatoinType insert for ChangeType.create", () => {
            var actual = instance().createOpTypeFilter({ when: [ChangeType.create] });

            expect(actual.$match).toEqual({ operationType: { $in: ['insert'] } });
        });
        it("Adds match operatoinType update or replace for ChangeType.update", () => {

            var actual = instance().createOpTypeFilter({ when: [ChangeType.update] });

            expect(actual.$match).toEqual({ operationType: { $in: ['update', 'replace'] } });
        });
        it("Adds match operatoinType delete  for ChangeType.remove", () => {

            var actual = instance().createOpTypeFilter({ when: [ChangeType.remove] });

            expect(actual.$match).toEqual({ operationType: 'delete' });
        });
    })
    describe("createOptions", () => {


        it("Sets 'fullDocument' to 'updateLookup' when fields present", () => {
            var actual = instance().createOptions(sampleOptions1);

            expect(actual.fullDocument).toBe('updateLookup');
        })

        it("Sets 'fullDocument' to 'default' when fields empty", () => {
            var sample = sampleOptions1;

            delete sample.fields;

            var actual = instance().createOptions(sample);

            expect(actual.fullDocument).toBe('default');
        })
    })

    describe("fix filter naming", () => {
        it("Adds 'fullDocument' prefix to fields that need it", () => {
            var actual = instance().ensureDocumentFilterFieldNaming({ name: 'bob' });

            expect(actual['fullDocument.name']).toBe('bob')
        })

        it("Leaves fields already prefixed with 'fullDocument' as is", () => {
            var actual = instance().ensureDocumentFilterFieldNaming({ 'fullDocument.something': 3 });

            expect(actual).toEqual({ 'fullDocument.something': 3 })
        })

        it("fixes fields in $or clause", () => {
            var actual = instance().ensureDocumentFilterFieldNaming({ $or: [{ foo: 1 }, { bar: { $gt: 2 } }] });

            expect(actual).toEqual({ $or: [{ 'fullDocument.foo': 1 }, { 'fullDocument.bar': { $gt: 2 } }] })
        })
    })

    describe("fixKeyName", () => {
        it("returns same key if operator", () => {
            expect(Gling.prototype.fixKeyName("$or")).toBe("$or");
        })
        it("returns same key if already prefixed with 'fullDocument.'", () => {
            expect(Gling.prototype.fixKeyName("fullDocument.foo")).toBe("fullDocument.foo");
        })
        it("fixes name", () => {
            expect(Gling.prototype.fixKeyName("foo")).toBe("fullDocument.foo");
        })
    })

    describe("String.isOperatorName", () => {
        it("true when starts with $", () => {
            expect("$or".isOperatorName()).toBe(true);
        })

        it("false when starts with $", () => {
            expect("blah".isOperatorName()).toBe(false);
        })

    })

    describe("String.isFullDocumentPrefixed", () => {
        it("true when starts with 'fullDocument.'", () => {
            expect("fullDocument.bar".isFullDocumentPrefixed()).toBe(true);
        })

        it("false when starts without 'fullDocument.'", () => {
            expect("full".isFullDocumentPrefixed()).toBe(false);
        })

    })
    describe("String.isOriginAllowed", () => {
        it("true when list has '*' in it", () => {
            expect("https://example.com/gling".isOriginAllowed(['abc','*'])).toBe(true);
        })
        it("true when list has specified origin in it", () => {
            expect('https://example.com/gling'.isOriginAllowed(['https://example.com/gling'])).toBe(true);
        })
        
        it("false when list empty", () => {
            expect('https://example.com/gling'.isOriginAllowed([])).toBe(false);
        })
        it("false when no list passed", () => {
            expect('https://example.com/gling'.isOriginAllowed(null)).toBe(false);
        })
        it("false when argument not array", () => {
            expect('https://example.com/gling'.isOriginAllowed('not_an_array')).toBe(false);
        })


    })

    describe("Gling.getEventPayload", () => {
        it("Returns value of 'fullDocument'", () => {
            var subject = { fullDocument: { _id: 1, 'name': 'bob' }, documentKey: { _id: "abc" } };
            expect(instance().getEventPayload(subject)).toEqual(subject.fullDocument);
        })

        it("Returns value of 'documentKey' when no 'fullDocument' value", () => {
            var subject = { documentKey: { _id: "abc" } };
            expect(instance().getEventPayload(subject)).toEqual(subject.documentKey);
        })

    })
})

function instance() {
    return new Gling({ listeners: [] });
}
