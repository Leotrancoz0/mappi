# Arquitetura conceitual

O Mappi separa o desenho do processo da sua execução sem fazer o usuário recadastrar o mesmo trabalho em módulos diferentes.

```text
Mapa
  └─ versão publicada
       └─ execução
            ├─ tarefa atual
            │    ├─ checklist
            │    ├─ prazo ──→ agenda
            │    ├─ revisão
            │    └─ decisão
            └─ próxima tarefa
```

## Contrato do produto

1. O mapa define a ordem, o tipo e os requisitos de cada etapa.
2. A publicação congela uma versão executável do mapa.
3. Iniciar a versão cria somente a tarefa atual.
4. A tarefa em andamento cumpre seus requisitos e passa por revisão.
5. Aprovar a revisão registra o resultado e libera a etapa seguinte.
6. Uma decisão pode continuar o caminho ou gerar um ajuste antes da retomada.
7. A agenda lê os prazos das tarefas; ela não mantém uma cópia paralela.

## Implementação desta demonstração

O motor funcional está isolado em `app/demo-engine.ts`. Ao iniciar uma execução, a tarefa guarda um snapshot sintético das etapas e conexões publicadas; edições posteriores do mapa não alteram o caminho já iniciado. A interface usa um canvas espacial para o desenho e estado React para a execução, persistindo mapas, posições, conexões e tarefas somente no `localStorage`, sob uma chave exclusiva. Não há API, banco de dados, autenticação, telemetria ou conexão externa.

Em um produto comercial, persistência, versionamento, autorização, auditoria e integrações seriam serviços próprios. Esses componentes não fazem parte do case público.
