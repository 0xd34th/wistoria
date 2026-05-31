import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Wistoria";

// Monthly plan
const MONTHLY_PRODUCT_IDENTIFIER = "wistoria_pro_monthly";
const MONTHLY_PLAY_STORE_PRODUCT_IDENTIFIER = "wistoria_pro_monthly:monthly";
const MONTHLY_PRODUCT_DISPLAY_NAME = "Wistoria Pro Monthly";
const MONTHLY_PRODUCT_USER_FACING_TITLE = "Wistoria Pro – Monthly";
const MONTHLY_PRODUCT_DURATION = "P1M";

// Annual plan
const ANNUAL_PRODUCT_IDENTIFIER = "wistoria_pro_annual";
const ANNUAL_PLAY_STORE_PRODUCT_IDENTIFIER = "wistoria_pro_annual:annual";
const ANNUAL_PRODUCT_DISPLAY_NAME = "Wistoria Pro Annual";
const ANNUAL_PRODUCT_USER_FACING_TITLE = "Wistoria Pro – Annual";
const ANNUAL_PRODUCT_DURATION = "P1Y";

const APP_STORE_APP_NAME = "Wistoria iOS";
const APP_STORE_BUNDLE_ID = "com.wistoria.app";
const PLAY_STORE_APP_NAME = "Wistoria Android";
const PLAY_STORE_PACKAGE_NAME = "com.wistoria.app";

const ENTITLEMENT_IDENTIFIER = "pro";
const ENTITLEMENT_DISPLAY_NAME = "Pro Access";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

const MONTHLY_PACKAGE_IDENTIFIER = "$rc_monthly";
const MONTHLY_PACKAGE_DISPLAY_NAME = "Monthly";
const ANNUAL_PACKAGE_IDENTIFIER = "$rc_annual";
const ANNUAL_PACKAGE_DISPLAY_NAME = "Annual";

// Prices in micros (amount * 1,000,000)
const MONTHLY_PRICES = [
  { amount_micros: 7990000, currency: "USD" }, // $7.99/month
];

const ANNUAL_PRICES = [
  { amount_micros: 59990000, currency: "USD" }, // $59.99/year (~$5/month)
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ───────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ─────────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found");
  console.log("Test store app found:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app found:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app found:", playStoreApp.id);
  }

  // ── Products ──────────────────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeIdentifier: string,
    displayName: string,
    userFacingTitle: string,
    duration: string,
    isTestStore: boolean,
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === storeIdentifier && p.app_id === targetApp.id,
    );
    if (existing) {
      console.log(`${label} product already exists:`, existing.id);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: storeIdentifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: displayName,
    };
    if (isTestStore) {
      body.subscription = { duration };
      body.title = userFacingTitle;
    }
    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error) throw new Error(`Failed to create ${label} product`);
    console.log(`Created ${label} product:`, created.id);
    return created;
  };

  const monthlyTest = await ensureProduct(testStoreApp, "Monthly Test Store", MONTHLY_PRODUCT_IDENTIFIER, MONTHLY_PRODUCT_DISPLAY_NAME, MONTHLY_PRODUCT_USER_FACING_TITLE, MONTHLY_PRODUCT_DURATION, true);
  const monthlyAppStore = await ensureProduct(appStoreApp, "Monthly App Store", MONTHLY_PRODUCT_IDENTIFIER, MONTHLY_PRODUCT_DISPLAY_NAME, MONTHLY_PRODUCT_USER_FACING_TITLE, MONTHLY_PRODUCT_DURATION, false);
  const monthlyPlayStore = await ensureProduct(playStoreApp, "Monthly Play Store", MONTHLY_PLAY_STORE_PRODUCT_IDENTIFIER, MONTHLY_PRODUCT_DISPLAY_NAME, MONTHLY_PRODUCT_USER_FACING_TITLE, MONTHLY_PRODUCT_DURATION, false);

  const annualTest = await ensureProduct(testStoreApp, "Annual Test Store", ANNUAL_PRODUCT_IDENTIFIER, ANNUAL_PRODUCT_DISPLAY_NAME, ANNUAL_PRODUCT_USER_FACING_TITLE, ANNUAL_PRODUCT_DURATION, true);
  const annualAppStore = await ensureProduct(appStoreApp, "Annual App Store", ANNUAL_PRODUCT_IDENTIFIER, ANNUAL_PRODUCT_DISPLAY_NAME, ANNUAL_PRODUCT_USER_FACING_TITLE, ANNUAL_PRODUCT_DURATION, false);
  const annualPlayStore = await ensureProduct(playStoreApp, "Annual Play Store", ANNUAL_PLAY_STORE_PRODUCT_IDENTIFIER, ANNUAL_PRODUCT_DISPLAY_NAME, ANNUAL_PRODUCT_USER_FACING_TITLE, ANNUAL_PRODUCT_DURATION, false);

  // ── Test store prices ─────────────────────────────────────────────────────
  for (const [product, prices, label] of [
    [monthlyTest, MONTHLY_PRICES, "monthly"] as const,
    [annualTest, ANNUAL_PRICES, "annual"] as const,
  ]) {
    const { data: _priceData, error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: product.id },
      body: { prices },
    });
    if (priceError) {
      if (typeof priceError === "object" && "type" in priceError && priceError["type"] === "resource_already_exists") {
        console.log(`Test store prices already exist for ${label} product`);
      } else {
        throw new Error(`Failed to add test store prices for ${label}`);
      }
    } else {
      console.log(`Added test store prices for ${label} product`);
    }
  }

  // ── Entitlement ───────────────────────────────────────────────────────────
  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEntitlement, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEntitlement.id);
    entitlement = newEntitlement;
  }

  const { error: attachEntitlementError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: {
      product_ids: [monthlyTest.id, monthlyAppStore.id, monthlyPlayStore.id, annualTest.id, annualAppStore.id, annualPlayStore.id],
    },
  });
  if (attachEntitlementError) {
    if (attachEntitlementError.type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached all products to entitlement");
  }

  // ── Offering ──────────────────────────────────────────────────────────────
  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOffering, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOffering.id);
    offering = newOffering;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // ── Packages ──────────────────────────────────────────────────────────────
  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  const ensurePackage = async (lookupKey: string, displayName: string): Promise<Package> => {
    const existing = existingPackages.items?.find((p) => p.lookup_key === lookupKey);
    if (existing) {
      console.log(`Package ${lookupKey} already exists:`, existing.id);
      return existing;
    }
    const { data: created, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering!.id },
      body: { lookup_key: lookupKey, display_name: displayName },
    });
    if (error) throw new Error(`Failed to create package ${lookupKey}`);
    console.log(`Created package ${lookupKey}:`, created.id);
    return created;
  };

  const monthlyPkg = await ensurePackage(MONTHLY_PACKAGE_IDENTIFIER, MONTHLY_PACKAGE_DISPLAY_NAME);
  const annualPkg = await ensurePackage(ANNUAL_PACKAGE_IDENTIFIER, ANNUAL_PACKAGE_DISPLAY_NAME);

  for (const [pkg, testProduct, appProduct, playProduct, label] of [
    [monthlyPkg, monthlyTest, monthlyAppStore, monthlyPlayStore, "monthly"] as const,
    [annualPkg, annualTest, annualAppStore, annualPlayStore, "annual"] as const,
  ]) {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: testProduct.id, eligibility_criteria: "all" },
          { product_id: appProduct.id, eligibility_criteria: "all" },
          { product_id: playProduct.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (error) {
      if (error.type === "unprocessable_entity_error" && error.message?.includes("Cannot attach product")) {
        console.log(`Skipping ${label} package attach: already has product`);
      } else {
        throw new Error(`Failed to attach products to ${label} package`);
      }
    } else {
      console.log(`Attached products to ${label} package`);
    }
  }

  // ── API Keys ──────────────────────────────────────────────────────────────
  const { data: testKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: testStoreApp.id } });
  const { data: iosKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp.id } });
  const { data: androidKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp.id } });

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testStoreApp.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement Identifier:", ENTITLEMENT_IDENTIFIER);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY =", testKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY =", iosKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY =", androidKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("====================\n");
  console.log("Next: copy the env var values above and add them as Replit secrets.");
}

seedRevenueCat().catch(console.error);
