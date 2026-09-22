import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM";

export interface PlatformAlert {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  detail: string;
  occurredAt: string;
  url: string;
}

const AUTH_FAILURE_THRESHOLD = 5;
const GPS_STALE_MINUTES = 15;
const SUBSCRIPTION_EXPIRING_DAYS = 7;
const NOTIFICATION_FAILURE_WINDOW_HOURS = 24;
const NOTIFICATION_FAILURE_THRESHOLD = 3;

/**
 * Dashboard Alerts feed (spec §9) — Critical/High/Medium, every alert
 * derived from a real current-state query. Conditions with no backing
 * data in this codebase today (DB health probe, tenant-isolation
 * detector, HRMS integration, large-job runner, storage/API-usage
 * metering) are deliberately NOT surfaced — an empty bucket is the
 * correct, honest result when nothing is wrong or nothing is tracked.
 */
@Injectable()
export class PlatformAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAlerts(): Promise<{ critical: PlatformAlert[]; high: PlatformAlert[]; medium: PlatformAlert[] }> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const staleGpsCutoff = new Date(now.getTime() - GPS_STALE_MINUTES * 60 * 1000);
    const notificationWindow = new Date(now.getTime() - NOTIFICATION_FAILURE_WINDOW_HOURS * 60 * 60 * 1000);
    const subscriptionCutoff = new Date(now.getTime() + SUBSCRIPTION_EXPIRING_DAYS * 24 * 60 * 60 * 1000);

    const [openSosIncidents, stalledPlans, recentFailedLogins, runningTrips, failedNotifications, expiringSubscriptions] =
      await Promise.all([
        // CRITICAL: SOS pipeline — an open SOS incident is the pipeline doing its job flagging a real emergency still unresolved.
        this.prisma.incident.findMany({
          where: { category: "SOS", status: { in: ["OPEN", "INVESTIGATING"] } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { trip: { select: { id: true, globalTripId: true, corporateOrgId: true } } },
        }),
        // CRITICAL: planning engine failure — a plan generation run that never finished (stuck in OPTIMIZING) is a crashed/hung allocation run.
        this.prisma.transportPlan.findMany({
          where: { status: "OPTIMIZING", updatedAt: { lt: new Date(now.getTime() - 10 * 60 * 1000) } },
          orderBy: { updatedAt: "desc" },
          take: 20,
          include: { organisation: { select: { id: true, displayName: true } } },
        }),
        // CRITICAL: authentication failure spike — real audit_log rows, thresholded.
        this.prisma.auditLog.count({ where: { action: "LOGIN_FAILED", createdAt: { gte: hourAgo } } }),
        // HIGH: GPS ingestion failure — a trip actually in motion with no location fix in the ingestion window.
        this.prisma.trip.findMany({
          where: { status: { in: ["EN_ROUTE_TO_FIRST_PICKUP", "RUNNING"] }, scheduledStartAt: { lt: now } },
          take: 50,
          include: {
            corporateOrg: { select: { displayName: true } },
            locationEvents: { orderBy: { recordedAt: "desc" }, take: 1 },
          },
        }),
        // HIGH: notification failure — real FAILED notification rows, thresholded over a rolling window.
        this.prisma.notification.count({ where: { status: "FAILED", createdAt: { gte: notificationWindow } } }),
        // MEDIUM: expiring subscription — real trialEndsAt/endsAt within the window, still active/trialing.
        this.prisma.subscription.findMany({
          where: {
            status: { in: ["ACTIVE", "TRIAL"] },
            OR: [
              { trialEndsAt: { gte: now, lte: subscriptionCutoff } },
              { endsAt: { gte: now, lte: subscriptionCutoff } },
            ],
          },
          include: { plan: { select: { name: true } } },
          take: 50,
        }),
      ]);

    const critical: PlatformAlert[] = [];
    const high: PlatformAlert[] = [];
    const medium: PlatformAlert[] = [];

    for (const incident of openSosIncidents) {
      critical.push({
        id: `sos-${incident.id}`,
        severity: "CRITICAL",
        category: "SOS pipeline",
        title: "Unresolved SOS incident",
        detail: incident.trip ? `Trip ${incident.trip.globalTripId} — status ${incident.status}` : `Status ${incident.status}`,
        occurredAt: incident.createdAt.toISOString(),
        url: incident.trip ? `/operations?tripId=${incident.trip.id}` : `/operations`,
      });
    }

    for (const plan of stalledPlans) {
      critical.push({
        id: `plan-stalled-${plan.id}`,
        severity: "CRITICAL",
        category: "Planning engine",
        title: "Plan generation stalled",
        detail: `${plan.organisation.displayName} plan stuck in OPTIMIZING since ${plan.updatedAt.toISOString()}`,
        occurredAt: plan.updatedAt.toISOString(),
        url: `/planning`,
      });
    }

    if (recentFailedLogins >= AUTH_FAILURE_THRESHOLD) {
      critical.push({
        id: `auth-failure-spike-${hourAgo.getTime()}`,
        severity: "CRITICAL",
        category: "Authentication",
        title: "Failed-login spike",
        detail: `${recentFailedLogins} failed logins in the last hour (threshold ${AUTH_FAILURE_THRESHOLD})`,
        occurredAt: now.toISOString(),
        url: `/security`,
      });
    }

    for (const trip of runningTrips) {
      const lastFix = trip.locationEvents[0]?.recordedAt;
      if (!lastFix || lastFix < staleGpsCutoff) {
        high.push({
          id: `gps-stale-${trip.id}`,
          severity: "HIGH",
          category: "GPS ingestion",
          title: "No recent GPS fix on an active trip",
          detail: `${trip.globalTripId} (${trip.corporateOrg.displayName}) — last fix ${lastFix ? lastFix.toISOString() : "never"}`,
          occurredAt: (lastFix ?? now).toISOString(),
          url: `/operations?tripId=${trip.id}`,
        });
      }
    }

    if (failedNotifications >= NOTIFICATION_FAILURE_THRESHOLD) {
      high.push({
        id: `notification-failures-${notificationWindow.getTime()}`,
        severity: "HIGH",
        category: "Notifications",
        title: "Notification delivery failures",
        detail: `${failedNotifications} FAILED notifications in the last ${NOTIFICATION_FAILURE_WINDOW_HOURS}h`,
        occurredAt: now.toISOString(),
        url: `/notifications`,
      });
    }

    for (const sub of expiringSubscriptions) {
      const expiresAt = sub.trialEndsAt && sub.trialEndsAt >= now ? sub.trialEndsAt : sub.endsAt;
      medium.push({
        id: `subscription-expiring-${sub.organisationId}`,
        severity: "MEDIUM",
        category: "Subscription",
        title: `${sub.status === "TRIAL" ? "Trial" : "Subscription"} expiring soon`,
        detail: `${sub.plan.name} plan expires ${expiresAt?.toISOString() ?? "soon"}`,
        occurredAt: now.toISOString(),
        url: `/organisations/${sub.organisationId}?tab=subscription`,
      });
    }

    const bySeverity = (list: PlatformAlert[]) => list.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    return { critical: bySeverity(critical), high: bySeverity(high), medium: bySeverity(medium) };
  }
}
