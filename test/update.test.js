const { expect } = require("chai");
const { checkValidUpdate } = require("../src/update");

describe("Update", () => {
  describe("check valid update", () => {
    it("says when an update is valid", () => {
      const update = aValidUpdate;

      const { isValid, error } = checkValidUpdate(update);

      expect(isValid).to.be.true;
      expect(error).to.be.null;
    });

    it("says when status is not valid", () => {
      const update = {
        ...aValidUpdate,
        status: "NOT_VALID",
      };

      const { isValid, error } = checkValidUpdate(update);

      expect(isValid).to.be.false;
      expect(error).to.contain("Invalid status NOT_VALID");
    });

    it("considers future dates as invalid", () => {
      const update = {
        ...aValidUpdate,
        date: new Date("2100-10-10"),
      };

      const { isValid, error } = checkValidUpdate(update);

      expect(isValid).to.be.false;
      expect(error).to.contain("Future date not supported");
    });

    it("considers missing service key as invalid", () => {
      const update = {
        ...aValidUpdate,
        serviceKey: null,
      };

      const { isValid, error } = checkValidUpdate(update);

      expect(isValid).to.be.false;
      expect(error).to.contain("Missing service key");
    });

    it("considers missing service name as invalid", () => {
      const update = {
        ...aValidUpdate,
        serviceName: null,
      };

      const { isValid, error } = checkValidUpdate(update);

      expect(isValid).to.be.false;
      expect(error).to.contain("Missing service name");
    });

    it("considers missing link as invalid", () => {
      const update = {
        ...aValidUpdate,
        link: null,
      };

      const { isValid, error } = checkValidUpdate(update);

      expect(isValid).to.be.false;
      expect(error).to.contain("Missing link to incident");
    });

    it("considers missing tile as invalid", () => {
      const update = {
        ...aValidUpdate,
        title: null,
      };

      const { isValid, error } = checkValidUpdate(update);

      expect(isValid).to.be.false;
      expect(error).to.contain("Missing title");
    });

    it("considers missing description as invalid", () => {
      const update = {
        ...aValidUpdate,
        description: null,
      };

      const { isValid, error } = checkValidUpdate(update);

      expect(isValid).to.be.false;
      expect(error).to.contain("Missing description");
    });

    it("considers undefined incident reference as invalid", () => {
      const update = {
        ...aValidUpdate,
        incidentReference: undefined,
      };

      const { isValid, error } = checkValidUpdate(update);

      expect(isValid).to.be.false;
      expect(error).to.contain("Incident reference is undefined");
    });

    const aValidUpdate = {
      title: "A_TITLE",
      serviceName: "A_SERVICE",
      serviceKey: "A_SERVICE",
      description: "A_DESCRIPTION",
      link: "A_LINK",
      status: "active",
      date: new Date("2020-10-10"),
      incidentReference: null,
    };
  });
});
