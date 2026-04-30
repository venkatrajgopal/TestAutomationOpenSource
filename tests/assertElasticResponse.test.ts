import { test } from "@playwright/test";
import {
  containsKeyword,
  isMissing,
  reportSummary,
  validateEachMessage,
  validateMessageChecks,
  validatePresence,
  type StoredMessage
} from "../pageObjects/pegaapi/elasticAssertions.js";

const storedRun = {
  runId: "ae627942-9e7e-4803-81cc-38feb3042746",
  timestamp: "2026-04-29T21:28:57.673Z",
  messages: [
    {
      pageName: "D_Booking",
      requestBody: {
        body: "RHUgaGFyIGJDbXpXROIGVOdCBtZWRkZWxhbmlIGZyYWVuIEFyYmV0c2JDbnJtZWRsaW5nZW4uIFNlIGJpbGFnYS4=",
        genomforande_ref: 123
      },
      responseBody: {
        id: "95607c4a-88c1-4928-8df1-c49e1ee93043",
        pxObjClass: "AF-NADIM-Int-V1-Eletter-EletterAPI_Response_POST",
        bookingID: "B123"
      },
      ResponseCode: 200
    },
    {
      pageName: "LEV MSFA",
      requestBody: {
        body: "RHUgaGFyIGJDbXpXROIGVOdCBtZWRkZWxhbmlIGZyYWVuIEFyYmV0c2JDbnJtZWRsaW5nZW4uIFNlIGJpbGFnYS4=",
        genomforande_ref: 123
      },
      responseBody: {
        id: "95607c4a-88c1-4928-8df1-c49e1ee93043",
        pxObjClass: "AF-NADIM-Int-V1-Eletter-EletterAPI_Response_POST",
        bookingID: "B123"
      },
      ResponseCode: 500
    },
    {
      pageName: "TestDecision",
      requestBody: {
        body: "RHUgaGFyIGJDbXpXROIGVOdCBtZWRkZWxhbmlIGZyYWVuIEFyYmV0c2JDbnJtZWRsaW5nZW4uIFNlIGJpbGFnYS4=",
        pxObjClass: "AF-NADIM-Int-V1-Eletter-MessagePayloads"
      },
      responseBody: {
        pxObjClass: "AF-NADIM-Int-V1-Eletter-EletterAPI_Response_POST"
      },
      ResponseCode: 200
    },
    {
      pageName: "D_CaseEvent",
      requestBody: {
        body: "RHUgaGFyIGJDbXpXROIGVOdCBtZWRkZWxhbmlIGZyYWVuIEFyYmV0c2JDbnJtZWRsaW5nZW4uIFNlIGJpbGFnYS4=",
        genomforande_ref: 123,
        typ: "Beslut bifall"
      },
      responseBody: {
        pxObjClass: "AF-NADIM-Int-V1-Eletter-EletterAPI_Response_POST"
      },
      ResponseCode: 200
    }
  ]
};

test("Test 1: validates Booking, LEV MSFA and NADIM are present", async () => {
  const namesToCheck = ["Booking", "LEV MSFA", "NADIM"];

  const issues = validatePresence(
    storedRun.messages as StoredMessage[],
    namesToCheck,
    (message, expectedLabel) => containsKeyword(message, expectedLabel)
  );

  reportSummary("Test 1", issues);
});

test("Test 2: validates all response codes are 200 or 201", async () => {
  const issues = validateEachMessage(storedRun.messages as StoredMessage[], (message) => {
    const ok = message.ResponseCode === 200 || message.ResponseCode === 201;
    return {
      ok,
      issue: `Invalid ResponseCode ${message.ResponseCode} for page ${message.pageName}`,
      assertionMessage: `Expected ResponseCode 200/201 for ${message.pageName}`
    };
  });

  reportSummary("Test 2", issues);
});

test("Test 3: validates LEV MSFA, NADIM and CaseEvent payload rules", async () => {
  const messages = storedRun.messages as StoredMessage[];

  const issues = [
    ...validateMessageChecks(messages, "LEV MSFA", [
      {
        label: "bookingID",
        getValue: (message) => message.requestBody.bookingID,
        isValid: (value) => !isMissing(value),
        failureMessage: () => "LEV MSFA requestBody.bookingID is null/empty.",
        assertionMessage: "LEV MSFA requestBody.bookingID should not be null/empty"
      },
      {
        label: "genomforande_ref",
        getValue: (message) => message.requestBody.genomforande_ref,
        isValid: (value) => !isMissing(value),
        failureMessage: () => "LEV MSFA requestBody.genomforande_ref is null/empty.",
        assertionMessage: "LEV MSFA requestBody.genomforande_ref should not be null/empty"
      },
      {
        label: "pxObjClass",
        getValue: (message) => message.responseBody.pxObjClass,
        isValid: (value) => !isMissing(value),
        failureMessage: () => "LEV MSFA responseBody.pxObjClass is null/empty.",
        assertionMessage: "LEV MSFA responseBody.pxObjClass should not be null/empty"
      }
    ]),
    ...validateMessageChecks(messages, "NADIM", [
      {
        label: "id",
        getValue: (message) => message.responseBody.id,
        isValid: (value) => !isMissing(value),
        failureMessage: () => "NADIM responseBody.id is null/empty.",
        assertionMessage: "NADIM responseBody.id should not be null/empty"
      }
    ]),
    ...validateMessageChecks(messages, "CaseEvent", [
      {
        label: "typ",
        getValue: (message) => String(message.requestBody.typ ?? ""),
        isValid: (value) => String(value).includes("Beslut bifall"),
        failureMessage: (value) => `CaseEvent requestBody.typ does not contain 'Beslut bifall': '${String(value)}'.`,
        assertionMessage: "CaseEvent requestBody.typ should contain 'Beslut bifall'"
      },
      {
        label: "genomforande_ref",
        getValue: (message) => message.requestBody.genomforande_ref,
        isValid: (value) => !isMissing(value),
        failureMessage: () => "CaseEvent requestBody.genomforande_ref is null/empty.",
        assertionMessage: "CaseEvent requestBody.genomforande_ref should not be null/empty"
      }
    ])
  ];

  reportSummary("Test 3", issues);
});