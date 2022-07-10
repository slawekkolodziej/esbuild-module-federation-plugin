import { remoteEntryTemplate } from "../remoteEntry";
import { mockModule } from "../../utils/testUtils";

let defaultShareScopes;
let defaultModules;

describe("remoteEntry", () => {
  beforeEach(() => {
    defaultShareScopes = {};
    defaultModules = {
      "@runtime/federation/sharing": {
        shareScopes: defaultShareScopes,
        initSharing: () => Promise.resolve(),
      },
    };
  });

  it("assigns itself to globalThis", async () => {
    const [_, globalThis] = await mockModule(
      remoteEntryTemplate({ name: "app1" }),
      defaultModules
    );

    expect(globalThis.app1).toBeDefined();
    expect(globalThis.app1).toHaveProperty("init");
    expect(globalThis.app1).toHaveProperty("get");
  });

  it("exposes modules through .get() function", async () => {
    const modules = {
      ...defaultModules,
      "./src/helloWorld": {
        default: "hello world",
      },
      "./src/foobar": {
        default: "foobar module",
      },
    };

    const [_, globalThis] = await mockModule(
      remoteEntryTemplate({
        name: "app1",
        shared: ["react", "react-dom"],
        exposes: {
          "./helloWorld": "./src/helloWorld",
          "./foobar": "./src/foobar",
        },
      }),
      modules
    );

    globalThis.app1.init({});

    const helloWorldModuleFactory = globalThis.app1.get("./helloWorld");
    const helloWorldModule = await helloWorldModuleFactory();

    expect(helloWorldModule.default).toEqual("hello world");

    const foobarModuleFactory = globalThis.app1.get("./foobar");
    const foobarModule = await foobarModuleFactory();

    expect(foobarModule.default).toEqual("foobar module");
  });

  it("allows exposed modules to access shared scope", async () => {
    const modules = {
      ...defaultModules,
      "./src/exposed": /* js */ `
        import stringFromSharedLib from 'shared-lib';
        export default 'exposed ' + stringFromSharedLib;
      `,
      "shared-lib": {
        default: "string from shared lib",
      },
    };

    const [_, globalThis] = await mockModule(
      remoteEntryTemplate({
        name: "app1",
        shared: ["shared-lib"],
        exposes: {
          "./exposed": "./src/exposed",
        },
      }),
      modules
    );

    globalThis.app1.init({});

    const exposedModuleFactory = globalThis.app1.get("./exposed");
    const exposedModule = await exposedModuleFactory();

    expect(exposedModule.default).toEqual("exposed string from shared lib");
  });

  it("throws when accessing module that does not exist", async () => {
    const [_, globalThis] = await mockModule(
      remoteEntryTemplate({
        name: "app1",
        exposes: {},
      }),
      defaultModules
    );

    globalThis.app1.init({});

    try {
      await globalThis.app1.get("./non-existing");
      throw new Error("Undesired error!");
    } catch (err) {
      expect(err.message).toEqual(
        'Module "./non-existing" does not exist in container.'
      );
    }
  });

  it("throws when trying to initialize module more than once", async () => {
    const [_, globalThis] = await mockModule(
      remoteEntryTemplate({
        name: "app1",
        exposes: {},
      }),
      defaultModules
    );

    globalThis.app1.init({});

    try {
      globalThis.app1.init({});
      throw new Error("Undesired error!");
    } catch (err) {
      expect(err.message).toEqual(
        "Container initialization failed as it has already been initialized with a different share scope."
      );
    }
  });
});
