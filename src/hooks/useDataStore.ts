import { useState, useEffect, useCallback } from "react";
import {
  Invoice,
  Customer,
  getStoredInvoices,
  getStoredCustomers,
  getN8nConfig,
  getStoredBusinessProfile,
  saveInvoice,
  deleteInvoice,
  saveCustomer,
  addInvoiceEvidence,
  saveN8nConfig,
  saveBusinessProfile,
  clearAllData,
  loadSampleData,
  N8nConfig,
  BusinessProfile,
  ForecastSettings,
  getStoredForecastSettings,
  saveForecastSettings,
} from "../data/dataStore";

export function useDataStore() {
  const [invoices, setInvoices] = useState<Invoice[]>(getStoredInvoices);
  const [customers, setCustomers] = useState<Customer[]>(getStoredCustomers);
  const [n8nConfig, setN8nConfigState] = useState<N8nConfig>(getN8nConfig);
  const [businessProfile, setBusinessProfileState] = useState<BusinessProfile>(getStoredBusinessProfile);
  const [forecastSettings, setForecastSettingsState] = useState<ForecastSettings>(getStoredForecastSettings);

  const refresh = useCallback(() => {
    setInvoices(getStoredInvoices());
    setCustomers(getStoredCustomers());
    setN8nConfigState(getN8nConfig());
    setBusinessProfileState(getStoredBusinessProfile());
    setForecastSettingsState(getStoredForecastSettings());
  }, []);

  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener("cc-store-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("cc-store-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refresh]);

  return {
    invoices,
    customers,
    n8nConfig,
    businessProfile,
    forecastSettings,
    refresh,
    saveInvoice: (inv: Invoice) => {
      saveInvoice(inv);
      refresh();
    },
    saveForecastSettings: (cfg: ForecastSettings) => {
      saveForecastSettings(cfg);
      refresh();
    },
    deleteInvoice: (id: string) => {
      deleteInvoice(id);
      refresh();
    },
    saveCustomer: (cust: Customer) => {
      saveCustomer(cust);
      refresh();
    },
    addInvoiceEvidence: (invoiceId: string, entry: any) => {
      addInvoiceEvidence(invoiceId, entry);
      refresh();
    },
    saveN8nConfig: (cfg: N8nConfig) => {
      saveN8nConfig(cfg);
      refresh();
    },
    saveBusinessProfile: (prof: BusinessProfile) => {
      saveBusinessProfile(prof);
      refresh();
    },
    clearAllData: () => {
      clearAllData();
      refresh();
    },
    loadSampleData: () => {
      loadSampleData();
      refresh();
    },
  };
}
