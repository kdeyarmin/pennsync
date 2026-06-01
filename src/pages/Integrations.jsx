import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plug,
  ShieldAlert,
  Building2,
  Phone,
  FileText,
  Sparkles,
  Cloud,
  Info,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import IntegrationCard from "@/components/integrations/IntegrationCard";
import OfficeAllyConnector from "@/components/integrations/OfficeAllyConnector";

/**
 * Integrations — a single, friendly home for every outside-software connection.
 *
 * The goal is "seamless and easy": one place to see what is connected and to run
 * the connection without hunting through admin tabs. Office Ally is featured with
 * its full connect-and-sync flow inline; the other services link to where they
 * are configured.
 */
export default function Integrations() {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) return null;

  if (currentUser?.role !== "admin") {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600">Only administrators can manage integrations.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="page-header-gradient bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 mb-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
            <Plug className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Integrations</h1>
            <p className="text-blue-100 mt-1">
              Connect PennSync to the outside software you already use — set up once, sync in one click.
            </p>
          </div>
        </div>
      </div>

      {/* Featured: Office Ally */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Patient data</h2>
        <IntegrationCard
          icon={Building2}
          name="Office Ally"
          category="Practice management & clearinghouse"
          description="Keep your roster in sync — drop an Office Ally census or discharge export and PennSync adds new patients or archives discharged ones automatically. No mapping, no guesswork."
          status="ready"
          accent="text-blue-600"
          actionLabel="Sync roster"
          defaultOpen
        >
          <OfficeAllyConnector />
          <Alert className="mt-4 bg-blue-50 border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              First time? See the{" "}
              <a
                href="https://github.com/kdeyarmin/pennsync/blob/main/docs/office-ally-integration.md"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                Office Ally setup guide
              </a>{" "}
              for which export to pull and how often to sync.
            </AlertDescription>
          </Alert>
        </IntegrationCard>
      </div>

      {/* Other connected services */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Communication & intelligence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntegrationCard
            icon={Phone}
            name="8x8 Phone & SMS"
            category="Voice & text (number masking)"
            description="Dedicated work numbers for nurses with the personal cell kept private. Configure sub-accounts and assign numbers."
            status="connected"
            accent="text-indigo-600"
            to={createPageUrl("AdminOperations")}
            actionLabel="Configure"
          />
          <IntegrationCard
            icon={FileText}
            name="Fax"
            category="Inbound & outbound documents"
            description="Send and track faxes, cover pages, and delivery status without leaving PennSync."
            status="connected"
            accent="text-emerald-600"
            to={createPageUrl("SendFax")}
            actionLabel="Open fax center"
          />
          <IntegrationCard
            icon={Sparkles}
            name="AI Clinical Intelligence"
            category="Document extraction & insights"
            description="Powers OCR import, OASIS assistance, and predictive insights. Tune models and behavior in settings."
            status="connected"
            accent="text-violet-600"
            to={createPageUrl("AdminOperations")}
            actionLabel="Configure"
          />
          <IntegrationCard
            icon={Cloud}
            name="PennSync Backend"
            category="Secure data & functions"
            description="Your secrets, storage, and backend functions. Managed in the Base44 dashboard."
            status="connected"
            accent="text-sky-600"
          />
        </div>
      </div>
    </div>
  );
}
