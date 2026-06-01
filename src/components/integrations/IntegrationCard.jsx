import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

const STATUS_META = {
  connected: { label: "Connected", className: "bg-green-100 text-green-800 border-green-200" },
  ready: { label: "Ready to use", className: "bg-blue-100 text-blue-800 border-blue-200" },
  setup: { label: "Setup needed", className: "bg-amber-100 text-amber-800 border-amber-200" },
};

/**
 * IntegrationCard — one external connection in the Integrations hub.
 *
 * Either links out to where the integration is configured/used (`to`) or, when
 * `children` are provided, expands inline to reveal a connector (used by Office
 * Ally so the whole connect-and-sync flow lives on one page).
 */
export default function IntegrationCard({
  icon: Icon,
  name,
  category,
  description,
  status = "ready",
  accent = "text-blue-600",
  to,
  actionLabel,
  children,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = STATUS_META[status] || STATUS_META.ready;
  const expandable = Boolean(children);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
            {Icon && <Icon className={`w-6 h-6 ${accent}`} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">{name}</h3>
                <p className="text-xs text-gray-500">{category}</p>
              </div>
              <Badge className={`${meta.className} text-xs`} variant="outline">
                {meta.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-2">{description}</p>

            <div className="mt-3">
              {expandable ? (
                <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
                  {actionLabel || "Open connector"}
                  {open ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </Button>
              ) : to ? (
                <Button asChild variant="outline" size="sm">
                  <Link to={to}>
                    {actionLabel || "Manage"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {expandable && open && <div className="mt-4 pt-4 border-t border-gray-100">{children}</div>}
      </CardContent>
    </Card>
  );
}
