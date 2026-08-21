import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/user.decorator";
import { UserPayloadGuard } from "../../common/guards/user-payload.guard";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateProfileDto } from "./dto/create-profile.dto";
import { UpdateNameDto } from "./dto/update-name.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { UserService } from "./user.service";

@Controller("api/user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("internal/create-profile")
  createProfile(@Body() dto: CreateProfileDto) {
    return this.userService.createProfile(dto);
  }

  @Get("internal/:id")
  getInternalUser(@Param("id") id: string) {
    return this.userService.getUserById(id);
  }

  @Patch("internal/:id/role")
  updateInternalRole(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.userService.updateRole(id, dto);
  }

  @Get("me")
  @UseGuards(UserPayloadGuard)
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getMyProfile(user._id);
  }

  @Get("user/all")
  @UseGuards(UserPayloadGuard)
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get("user/:id")
  @UseGuards(UserPayloadGuard)
  getUser(@Param("id") id: string) {
    return this.userService.getUserById(id);
  }

  @Post("update/user")
  @HttpCode(HttpStatus.OK)
  @UseGuards(UserPayloadGuard)
  updateName(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNameDto,
  ) {
    return this.userService.updateName(user._id, dto);
  }
}
