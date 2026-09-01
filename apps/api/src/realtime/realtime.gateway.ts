import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtPayload } from "../auth/jwt-payload";

/**
 * In-process real-time push, scoped by organisation room. This is the
 * honest substitute for a Kafka/WebSocket event backbone in an
 * environment with no external broker available — every module still
 * calls this directly (like `notification`/`audit` already do), it just
 * also fans out to connected browser clients instead of only writing a
 * log-only record. A genuine message-broker-backed backbone (spec §16)
 * is future work once real infrastructure exists.
 *
 * Auth: the client connects with `{ auth: { token: <JWT access token> } }`
 * — the same token used for REST calls. A client only ever joins its own
 * organisation's room, so a payload can never reach an unrelated tenant.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      client.data.organisationId = payload.orgId;
      client.join(`org:${payload.orgId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Push an event to every connected client of one organisation. Silently a no-op if nothing's connected. */
  emitToOrg(organisationId: string | null | undefined, event: string, payload: unknown) {
    if (!organisationId) return;
    this.server?.to(`org:${organisationId}`).emit(event, payload);
  }
}
