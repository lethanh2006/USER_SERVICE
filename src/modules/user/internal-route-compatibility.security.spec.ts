import { GUARDS_METADATA } from "@nestjs/common/constants";
import { GatewayIdentityGuard } from "../../common/guards/gateway-identity.guard";
import { UserController } from "./user.controller";

const controllerHandler = (name: string): object => {
  const handler = Object.getOwnPropertyDescriptor(
    UserController.prototype,
    name,
  )?.value as unknown;
  if (typeof handler !== "function") throw new Error(`Missing handler ${name}`);
  return handler;
};

describe("User internal route compatibility", () => {
  it("giữ internal GET không yêu cầu chữ ký trong batch hiện tại", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controllerHandler("getInternalUser"),
    ) as unknown[] | undefined;

    expect(guards).toBeUndefined();
  });

  it("bắt buộc chữ ký cho internal mutation", () => {
    const createGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      controllerHandler("createProfile"),
    ) as unknown[];
    const roleGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      controllerHandler("updateInternalRole"),
    ) as unknown[];

    expect(createGuards).toContain(GatewayIdentityGuard);
    expect(roleGuards).toContain(GatewayIdentityGuard);
  });
});
