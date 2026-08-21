import { Injectable, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq/rabbitmq.service";
import { UserService } from "./user.service";

@Injectable()
export class UserProfileSyncConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly userService: UserService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMQService.subscribe(
      "user-profile-sync",
      (message, metadata) =>
        this.userService.handleProfileSync(message, metadata),
    );
  }
}
