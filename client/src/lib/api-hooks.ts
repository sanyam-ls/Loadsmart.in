import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { Load, Bid, Truck, User, Shipment, Invoice, Notification, Document, CarrierProfile, NegotiationThread } from "@shared/schema";

type LoadWithBids = Load & { bids?: Bid[]; bidCount?: number };
type BidWithDetails = Bid & { carrier?: Partial<User>; load?: Load };
type CarrierWithProfile = Omit<User, 'password'> & { carrierProfile?: CarrierProfile };

export function useLoads() {
  return useQuery<LoadWithBids[]>({
    queryKey: ['/api/loads'],
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useLoad(id: string | undefined) {
  return useQuery<LoadWithBids>({
    queryKey: ['/api/loads', id],
    enabled: !!id,
    staleTime: 15000,
  });
}

export function useLoadHistory(loadId: string | undefined) {
  return useQuery({
    queryKey: ['/api/loads', loadId, 'history'],
    enabled: !!loadId,
  });
}

export function useCreateLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Load>) => {
      const res = await apiRequest('POST', '/api/loads', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
    },
  });
}

export function useUpdateLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Load> }) => {
      const res = await apiRequest('PATCH', `/api/loads/${id}`, updates);
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loads', id] });
    },
  });
}

export function useTransitionLoadState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ loadId, toStatus, reason }: { loadId: string; toStatus: string; reason?: string }) => {
      const res = await apiRequest('POST', `/api/loads/${loadId}/transition`, { toStatus, reason });
      return res.json();
    },
    onSuccess: (_, { loadId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loads', loadId] });
    },
  });
}

export function useBids() {
  return useQuery<BidWithDetails[]>({
    queryKey: ['/api/bids'],
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

export function useBidsByLoad(loadId: string | undefined) {
  return useQuery<BidWithDetails[]>({
    queryKey: ['/api/loads', loadId, 'bids'],
    enabled: !!loadId,
    staleTime: 10000,
  });
}

export function useCreateBid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Bid>) => {
      const res = await apiRequest('POST', '/api/bids', data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bids'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loads', variables.loadId, 'bids'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
    },
  });
}

export function useUpdateBid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Bid> & { action?: string } }) => {
      const res = await apiRequest('PATCH', `/api/bids/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bids'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
    },
  });
}

export function useTrucks() {
  return useQuery<Truck[]>({
    queryKey: ['/api/trucks'],
    staleTime: 60000,
  });
}

export function useCreateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Truck>) => {
      const res = await apiRequest('POST', '/api/trucks', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trucks'] });
    },
  });
}

export function useUpdateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Truck> }) => {
      const res = await apiRequest('PATCH', `/api/trucks/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trucks'] });
    },
  });
}

export function useDeleteTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/trucks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trucks'] });
    },
  });
}

export function useShipments() {
  return useQuery<Shipment[]>({
    queryKey: ['/api/shipments'],
    staleTime: 30000,
  });
}

export function useShipment(id: string | undefined) {
  return useQuery<Shipment>({
    queryKey: ['/api/shipments', id],
    enabled: !!id,
  });
}

export function useShipmentByLoad(loadId: string | undefined) {
  return useQuery<Shipment>({
    queryKey: ['/api/shipments/load', loadId],
    enabled: !!loadId,
  });
}

export function useInvoices() {
  return useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
    staleTime: 30000,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery<Invoice>({
    queryKey: ['/api/invoices', id],
    enabled: !!id,
  });
}

export function useInvoicesByShipper() {
  return useQuery<Invoice[]>({
    queryKey: ['/api/invoices/shipper'],
    staleTime: 30000,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Invoice>) => {
      const res = await apiRequest('POST', '/api/invoices', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const res = await apiRequest('PATCH', `/api/invoices/${id}`, updates);
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/invoices/${id}/send`);
      return res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
    },
  });
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('PATCH', `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });
}

export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: ['/api/documents'],
    staleTime: 60000,
  });
}

export function useDocumentsByLoad(loadId: string | undefined) {
  return useQuery<Document[]>({
    queryKey: ['/api/loads', loadId, 'documents'],
    enabled: !!loadId,
  });
}

export function useCarriers() {
  return useQuery<CarrierWithProfile[]>({
    queryKey: ['/api/carriers'],
    staleTime: 60000,
  });
}

export function useCarrier(id: string | undefined) {
  return useQuery<CarrierWithProfile>({
    queryKey: ['/api/carriers', id],
    enabled: !!id,
  });
}

export function useUsers() {
  return useQuery<Omit<User, 'password'>[]>({
    queryKey: ['/api/users'],
    staleTime: 60000,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['/api/admin/stats'],
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useAdminLoadQueue() {
  return useQuery<Load[]>({
    queryKey: ['/api/admin/load-queue'],
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

export function useNegotiationThreads() {
  return useQuery<NegotiationThread[]>({
    queryKey: ['/api/negotiations'],
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

export function useNegotiationThread(loadId: string | undefined) {
  return useQuery<NegotiationThread>({
    queryKey: ['/api/negotiations', loadId],
    enabled: !!loadId,
    staleTime: 10000,
  });
}

export function useAdminPricing(loadId: string | undefined) {
  return useQuery({
    queryKey: ['/api/admin/pricing', loadId],
    enabled: !!loadId,
  });
}

export function useCreateAdminPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { loadId: string; suggestedPrice: string; postMode?: string; invitedCarrierIds?: string[] }) => {
      const res = await apiRequest('POST', '/api/admin/pricing', data);
      return res.json();
    },
    onSuccess: (_, { loadId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing', loadId] });
      queryClient.invalidateQueries({ queryKey: ['/api/loads', loadId] });
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/load-queue'] });
    },
  });
}

export function useLockAdminPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pricingId, finalPrice, postMode, invitedCarrierIds }: { pricingId: string; finalPrice: string; postMode: string; invitedCarrierIds?: string[] }) => {
      const res = await apiRequest('POST', `/api/admin/pricing/${pricingId}/lock`, { finalPrice, postMode, invitedCarrierIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/load-queue'] });
    },
  });
}

export function useCarrierVerifications() {
  return useQuery({
    queryKey: ['/api/carrier-verifications'],
    staleTime: 30000,
  });
}

export function useCarrierVerification(carrierId: string | undefined) {
  return useQuery({
    queryKey: ['/api/carrier-verifications', carrierId],
    enabled: !!carrierId,
  });
}

export function useUpdateCarrierVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const res = await apiRequest('PATCH', `/api/carrier-verifications/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/carrier-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
    },
  });
}

export function useTelemetry(vehicleId?: string) {
  return useQuery({
    queryKey: vehicleId ? ['/api/telemetry/vehicles', vehicleId] : ['/api/telemetry/vehicles'],
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

export function useEtaPrediction(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['/api/telemetry/vehicles', vehicleId, 'eta'],
    enabled: !!vehicleId,
    staleTime: 30000,
  });
}

export function useSettlements() {
  return useQuery({
    queryKey: ['/api/settlements'],
    staleTime: 60000,
  });
}

export function useSettlementsByCarrier() {
  return useQuery({
    queryKey: ['/api/settlements/carrier'],
    staleTime: 60000,
  });
}

export function invalidateAllData() {
  queryClient.invalidateQueries();
}

export function invalidateLoads() {
  queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
}

export function invalidateBids() {
  queryClient.invalidateQueries({ queryKey: ['/api/bids'] });
}

export function invalidateInvoices() {
  queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
}

export { queryClient };
