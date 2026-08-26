import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../schemas/user.schema';
import { UserController } from './user.controller';
import { UserProfileSyncConsumer } from './user-profile-sync.consumer';
import { UserService } from './user.service';
import { GatewayIdentityGuard } from '../../common/guards/gateway-identity.guard';
import { GatewaySignatureService } from '../../common/security/gateway-signature.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserProfileSyncConsumer,
    GatewayIdentityGuard,
    GatewaySignatureService,
  ],
})
export class UserModule {}
