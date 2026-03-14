import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const AdminRelatorios = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">Dados reais de receita, custos e performance</p>
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Em breve</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Os relatórios financeiros com dados reais estarão disponíveis em breve.
                  Por enquanto, utilize o <a href="/admin/financeiro/simulacoes" className="text-primary hover:underline font-medium">Simulador Financeiro</a> para
                  projetar cenários.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {["Receita por período", "Custos operacionais", "Margem por atendimento"].map((item) => (
                <div key={item} className="h-32 flex items-center justify-center rounded-lg bg-secondary/50 border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRelatorios;
