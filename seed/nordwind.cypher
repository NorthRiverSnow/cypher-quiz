// NordWind Energy のグラフ。dataset/ のスナップショット
// checksum: 9d4eb12de6e731df3ee4d050df931922（元データと一致することの印）
//
// 投入の手順は nordwind-workshop の session3 と同じ。ノードを先に作り、
// リレーションシップは両端が揃ってから繋ぐ。

MATCH (n) DETACH DELETE n;

UNWIND [
  {name: "Grid Operations", focus: "real-time grid telemetry and control"},
  {name: "Customer Platform", focus: "customer-facing web and mobile experiences"},
  {name: "Payments & Billing", focus: "payment processing, invoicing, tariffs"},
  {name: "Data Platform", focus: "data lake, pipelines, analytics"},
  {name: "Core Infrastructure", focus: "Kubernetes, networking, observability"},
  {name: "Forecasting & AI", focus: "demand forecasting and ML services"},
  {name: "Field Systems", focus: "smart meters and field-device integration"},
  {name: "Security & Identity", focus: "authentication, authorization, compliance"}
] AS r
MERGE (t:Team {name: r.name}) SET t.focus = r.focus;

UNWIND [
  {name: "Motoko Kusanagi", role: "Staff Engineer"},
  {name: "Spike Spiegel", role: "Senior Engineer"},
  {name: "Edward Elric", role: "Engineer"},
  {name: "Levi Ackerman", role: "SRE"},
  {name: "Nami", role: "Tech Lead"},
  {name: "Usopp", role: "Senior Engineer"},
  {name: "Asuka Langley", role: "Frontend Engineer"},
  {name: "Tanjiro Kamado", role: "Engineer"},
  {name: "Nico Robin", role: "Tech Lead"},
  {name: "Light Yagami", role: "Senior Engineer"},
  {name: "Mikasa Ackerman", role: "Engineer"},
  {name: "Roronoa Zoro", role: "Payments Specialist"},
  {name: "Olivier Armstrong", role: "Staff Engineer"},
  {name: "L Lawliet", role: "Data Engineer"},
  {name: "Bulma", role: "Senior Engineer"},
  {name: "Shikamaru Nara", role: "Engineer"},
  {name: "Misato Katsuragi", role: "Principal SRE"},
  {name: "Kakashi Hatake", role: "SRE"},
  {name: "Franky", role: "Platform Engineer"},
  {name: "Yor Forger", role: "Network Engineer"},
  {name: "Senku Ishigami", role: "ML Engineer"},
  {name: "Frieren", role: "Senior ML Engineer"},
  {name: "Kurisu Makise", role: "Data Scientist"},
  {name: "Winry Rockbell", role: "Tech Lead"},
  {name: "Shinji Ikari", role: "Embedded Engineer"},
  {name: "Loid Forger", role: "Engineer"},
  {name: "Erza Scarlet", role: "Security Lead"},
  {name: "Killua Zoldyck", role: "Security Engineer"},
  {name: "Hinata Hyuga", role: "IAM Engineer"},
  {name: "Lelouch Lamperouge", role: "Compliance Engineer"}
] AS r
MERGE (e:Engineer {name: r.name}) SET e.role = r.role;

UNWIND [
  {name: "telemetry-ingest", description: "ingests real-time sensor data from grid substations", language: "Go"},
  {name: "grid-monitor", description: "real-time monitoring and alerting for grid health", language: "Go"},
  {name: "dispatch-optimizer", description: "optimizes power dispatch across generation assets", language: "Python"},
  {name: "customer-portal", description: "customer-facing web application for accounts and usage", language: "TypeScript"},
  {name: "mobile-api", description: "backend-for-frontend serving the mobile apps", language: "TypeScript"},
  {name: "outage-notifier", description: "sends outage notifications via email, SMS and push", language: "Python"},
  {name: "payment-gateway", description: "processes card and bank payments with external PSPs", language: "Java"},
  {name: "billing-engine", description: "computes invoices from usage data and tariff plans", language: "Java"},
  {name: "tariff-service", description: "manages tariff plans and pricing rules", language: "Java"},
  {name: "data-lake-sync", description: "syncs operational data into the analytics lake", language: "Python"},
  {name: "reporting-service", description: "generates regulatory and internal reports", language: "Python"},
  {name: "forecast-service", description: "predicts energy demand using ML models", language: "Python"},
  {name: "meter-reader", description: "collects readings from smart meters in the field", language: "Go"},
  {name: "auth-service", description: "authentication and token issuance for all platforms", language: "Go"},
  {name: "api-gateway", description: "edge routing, rate limiting and TLS termination", language: "Go"}
] AS r
MERGE (s:Service {name: r.name}) SET s.description = r.description, s.language = r.language;

UNWIND [
  {id: "INC-2101", title: "Billing run produced duplicate invoices", severity: "SEV2", date: "2025-07-16"},
  {id: "INC-2102", title: "Payment gateway timeout spike during evening peak", severity: "SEV1", date: "2025-08-05"},
  {id: "INC-2103", title: "Customer portal login failures after auth deploy", severity: "SEV1", date: "2025-08-20"},
  {id: "INC-2104", title: "Telemetry ingest lag exceeding 15 minutes", severity: "SEV2", date: "2025-09-04"},
  {id: "INC-2105", title: "Smart meter readings missing for region North", severity: "SEV2", date: "2025-09-19"},
  {id: "INC-2106", title: "Forecast service producing negative demand values", severity: "SEV3", date: "2025-10-04"},
  {id: "INC-2107", title: "API gateway 502 errors under load test", severity: "SEV3", date: "2025-10-14"},
  {id: "INC-2108", title: "Outage notifications sent to wrong customers", severity: "SEV1", date: "2025-10-29"},
  {id: "INC-2109", title: "Data lake sync silently dropping meter events", severity: "SEV2", date: "2025-11-13"},
  {id: "INC-2110", title: "Tariff update applied retroactively to closed invoices", severity: "SEV2", date: "2025-11-28"},
  {id: "INC-2111", title: "Auth token validation latency degrading all platforms", severity: "SEV1", date: "2025-12-13"},
  {id: "INC-2112", title: "Grid monitor false alarms flooding on-call", severity: "SEV3", date: "2025-12-23"},
  {id: "INC-2113", title: "Payment settlement file rejected by bank", severity: "SEV2", date: "2026-01-02"},
  {id: "INC-2114", title: "Mobile app showing stale usage data", severity: "SEV3", date: "2026-01-12"},
  {id: "INC-2115", title: "Dispatch optimizer using outdated forecasts", severity: "SEV2", date: "2026-01-27"},
  {id: "INC-2116", title: "Reporting service regulatory export failed month-end", severity: "SEV2", date: "2026-02-11"},
  {id: "INC-2117", title: "Customer portal checkout errors for corporate accounts", severity: "SEV2", date: "2026-02-26"},
  {id: "INC-2118", title: "Meter reader fleet disconnects after network change", severity: "SEV1", date: "2026-03-13"},
  {id: "INC-2119", title: "Duplicate outage push notifications", severity: "SEV3", date: "2026-03-28"},
  {id: "INC-2120", title: "Billing engine OOM during quarterly reconciliation", severity: "SEV1", date: "2026-04-12"}
] AS r
MERGE (i:Incident {id: r.id})
SET i.title = r.title, i.severity = r.severity, i.date = date(r.date);

UNWIND [
  {from: "Motoko Kusanagi", to: "Grid Operations"},
  {from: "Spike Spiegel", to: "Grid Operations"},
  {from: "Edward Elric", to: "Grid Operations"},
  {from: "Levi Ackerman", to: "Grid Operations"},
  {from: "Nami", to: "Customer Platform"},
  {from: "Usopp", to: "Customer Platform"},
  {from: "Asuka Langley", to: "Customer Platform"},
  {from: "Tanjiro Kamado", to: "Customer Platform"},
  {from: "Nico Robin", to: "Payments & Billing"},
  {from: "Light Yagami", to: "Payments & Billing"},
  {from: "Mikasa Ackerman", to: "Payments & Billing"},
  {from: "Roronoa Zoro", to: "Payments & Billing"},
  {from: "Olivier Armstrong", to: "Data Platform"},
  {from: "L Lawliet", to: "Data Platform"},
  {from: "Bulma", to: "Data Platform"},
  {from: "Shikamaru Nara", to: "Data Platform"},
  {from: "Misato Katsuragi", to: "Core Infrastructure"},
  {from: "Kakashi Hatake", to: "Core Infrastructure"},
  {from: "Franky", to: "Core Infrastructure"},
  {from: "Yor Forger", to: "Core Infrastructure"},
  {from: "Senku Ishigami", to: "Forecasting & AI"},
  {from: "Frieren", to: "Forecasting & AI"},
  {from: "Kurisu Makise", to: "Forecasting & AI"},
  {from: "Winry Rockbell", to: "Field Systems"},
  {from: "Shinji Ikari", to: "Field Systems"},
  {from: "Loid Forger", to: "Field Systems"},
  {from: "Erza Scarlet", to: "Security & Identity"},
  {from: "Killua Zoldyck", to: "Security & Identity"},
  {from: "Hinata Hyuga", to: "Security & Identity"},
  {from: "Lelouch Lamperouge", to: "Security & Identity"}
] AS r
MATCH (e:Engineer {name: r.from}), (t:Team {name: r.to})
MERGE (e)-[:MEMBER_OF]->(t);

UNWIND [
  {from: "Grid Operations", to: "telemetry-ingest"},
  {from: "Grid Operations", to: "grid-monitor"},
  {from: "Grid Operations", to: "dispatch-optimizer"},
  {from: "Customer Platform", to: "customer-portal"},
  {from: "Customer Platform", to: "mobile-api"},
  {from: "Customer Platform", to: "outage-notifier"},
  {from: "Payments & Billing", to: "payment-gateway"},
  {from: "Payments & Billing", to: "billing-engine"},
  {from: "Payments & Billing", to: "tariff-service"},
  {from: "Data Platform", to: "data-lake-sync"},
  {from: "Data Platform", to: "reporting-service"},
  {from: "Forecasting & AI", to: "forecast-service"},
  {from: "Field Systems", to: "meter-reader"},
  {from: "Security & Identity", to: "auth-service"},
  {from: "Core Infrastructure", to: "api-gateway"}
] AS r
MATCH (t:Team {name: r.from}), (s:Service {name: r.to})
MERGE (t)-[:OWNS]->(s);

UNWIND [
  {from: "grid-monitor", to: "telemetry-ingest"},
  {from: "dispatch-optimizer", to: "grid-monitor"},
  {from: "dispatch-optimizer", to: "forecast-service"},
  {from: "customer-portal", to: "mobile-api"},
  {from: "customer-portal", to: "billing-engine"},
  {from: "customer-portal", to: "auth-service"},
  {from: "mobile-api", to: "auth-service"},
  {from: "mobile-api", to: "billing-engine"},
  {from: "outage-notifier", to: "grid-monitor"},
  {from: "outage-notifier", to: "customer-portal"},
  {from: "billing-engine", to: "payment-gateway"},
  {from: "billing-engine", to: "tariff-service"},
  {from: "billing-engine", to: "meter-reader"},
  {from: "reporting-service", to: "data-lake-sync"},
  {from: "reporting-service", to: "billing-engine"},
  {from: "data-lake-sync", to: "telemetry-ingest"},
  {from: "data-lake-sync", to: "meter-reader"},
  {from: "forecast-service", to: "data-lake-sync"},
  {from: "api-gateway", to: "auth-service"},
  {from: "customer-portal", to: "api-gateway"},
  {from: "payment-gateway", to: "auth-service"}
] AS r
MATCH (a:Service {name: r.from}), (b:Service {name: r.to})
MERGE (a)-[:DEPENDS_ON]->(b);

UNWIND [
  {from: "INC-2101", to: "billing-engine"},
  {from: "INC-2102", to: "payment-gateway"},
  {from: "INC-2102", to: "billing-engine"},
  {from: "INC-2103", to: "customer-portal"},
  {from: "INC-2103", to: "auth-service"},
  {from: "INC-2104", to: "telemetry-ingest"},
  {from: "INC-2104", to: "grid-monitor"},
  {from: "INC-2105", to: "meter-reader"},
  {from: "INC-2105", to: "billing-engine"},
  {from: "INC-2106", to: "forecast-service"},
  {from: "INC-2107", to: "api-gateway"},
  {from: "INC-2108", to: "outage-notifier"},
  {from: "INC-2108", to: "customer-portal"},
  {from: "INC-2109", to: "data-lake-sync"},
  {from: "INC-2109", to: "meter-reader"},
  {from: "INC-2110", to: "tariff-service"},
  {from: "INC-2110", to: "billing-engine"},
  {from: "INC-2111", to: "auth-service"},
  {from: "INC-2111", to: "api-gateway"},
  {from: "INC-2111", to: "mobile-api"},
  {from: "INC-2112", to: "grid-monitor"},
  {from: "INC-2113", to: "payment-gateway"},
  {from: "INC-2114", to: "mobile-api"},
  {from: "INC-2114", to: "data-lake-sync"},
  {from: "INC-2115", to: "dispatch-optimizer"},
  {from: "INC-2115", to: "forecast-service"},
  {from: "INC-2116", to: "reporting-service"},
  {from: "INC-2116", to: "billing-engine"},
  {from: "INC-2117", to: "customer-portal"},
  {from: "INC-2117", to: "payment-gateway"},
  {from: "INC-2118", to: "meter-reader"},
  {from: "INC-2118", to: "telemetry-ingest"},
  {from: "INC-2119", to: "outage-notifier"},
  {from: "INC-2120", to: "billing-engine"},
  {from: "INC-2120", to: "reporting-service"}
] AS r
MATCH (i:Incident {id: r.from}), (s:Service {name: r.to})
MERGE (i)-[:AFFECTED]->(s);

UNWIND [
  {from: "Nico Robin", to: "INC-2101"},
  {from: "Light Yagami", to: "INC-2101"},
  {from: "Olivier Armstrong", to: "INC-2101"},
  {from: "Roronoa Zoro", to: "INC-2102"},
  {from: "Nico Robin", to: "INC-2102"},
  {from: "Misato Katsuragi", to: "INC-2102"},
  {from: "Nami", to: "INC-2103"},
  {from: "Hinata Hyuga", to: "INC-2103"},
  {from: "Kakashi Hatake", to: "INC-2103"},
  {from: "Motoko Kusanagi", to: "INC-2104"},
  {from: "Spike Spiegel", to: "INC-2104"},
  {from: "Winry Rockbell", to: "INC-2105"},
  {from: "Shinji Ikari", to: "INC-2105"},
  {from: "Mikasa Ackerman", to: "INC-2105"},
  {from: "Senku Ishigami", to: "INC-2106"},
  {from: "Frieren", to: "INC-2106"},
  {from: "Franky", to: "INC-2107"},
  {from: "Yor Forger", to: "INC-2107"},
  {from: "Usopp", to: "INC-2108"},
  {from: "Tanjiro Kamado", to: "INC-2108"},
  {from: "Nami", to: "INC-2108"},
  {from: "L Lawliet", to: "INC-2109"},
  {from: "Bulma", to: "INC-2109"},
  {from: "Loid Forger", to: "INC-2109"},
  {from: "Mikasa Ackerman", to: "INC-2110"},
  {from: "Light Yagami", to: "INC-2110"},
  {from: "Erza Scarlet", to: "INC-2111"},
  {from: "Hinata Hyuga", to: "INC-2111"},
  {from: "Misato Katsuragi", to: "INC-2111"},
  {from: "Franky", to: "INC-2111"},
  {from: "Spike Spiegel", to: "INC-2112"},
  {from: "Edward Elric", to: "INC-2112"},
  {from: "Roronoa Zoro", to: "INC-2113"},
  {from: "Lelouch Lamperouge", to: "INC-2113"},
  {from: "Asuka Langley", to: "INC-2114"},
  {from: "Shikamaru Nara", to: "INC-2114"},
  {from: "Levi Ackerman", to: "INC-2115"},
  {from: "Kurisu Makise", to: "INC-2115"},
  {from: "Frieren", to: "INC-2115"},
  {from: "Bulma", to: "INC-2116"},
  {from: "Olivier Armstrong", to: "INC-2116"},
  {from: "Nico Robin", to: "INC-2116"},
  {from: "Tanjiro Kamado", to: "INC-2117"},
  {from: "Roronoa Zoro", to: "INC-2117"},
  {from: "Winry Rockbell", to: "INC-2118"},
  {from: "Yor Forger", to: "INC-2118"},
  {from: "Loid Forger", to: "INC-2118"},
  {from: "Usopp", to: "INC-2119"},
  {from: "Asuka Langley", to: "INC-2119"},
  {from: "Light Yagami", to: "INC-2120"},
  {from: "Olivier Armstrong", to: "INC-2120"},
  {from: "Kakashi Hatake", to: "INC-2120"}
] AS r
MATCH (e:Engineer {name: r.from}), (i:Incident {id: r.to})
MERGE (e)-[:RESPONDED_TO]->(i);
