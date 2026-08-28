# Mappi

![Mappi — mapas que criam trabalho](./public/og-mappi-v2.png)

**Mapas que criam trabalho.** O Mappi transforma processos visuais em tarefas executáveis, decisões, aprovações e prazos — sem duplicar informação entre quadro e agenda.

Este repositório é um case independente de portfólio. A interface em tela cheia reconstrói a experiência do produto com dados sintéticos; não contém o código, os dados nem as integrações do ambiente comercial.

## O que você pode testar

- Navegar pela mesma estrutura do produto: Início, Mapas, Tarefas, Agenda e Aplicativos.
- Reorganizar os mapas no grid e mover tarefas pelo quadro com arrastar e soltar.
- Criar um mapa do zero ou iniciar uma nova tarefa a partir de um mapa publicado.
- Abrir um mapa e editar seu fluxo em um canvas espacial.
- Adicionar tarefas, decisões, aprovações e interconexões com configuração contextual.
- Publicar o mapa e iniciar uma execução que cria a primeira tarefa automaticamente.
- Cumprir checklist, enviar para revisão e ver a próxima etapa nascer no quadro.
- Acompanhar os mesmos prazos na Agenda, sem novo cadastro.

Os dados ficam somente no armazenamento local do navegador. Apps externos aparecem como demonstração visual e não conectam contas reais.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Validações disponíveis:

```bash
npm run check:demo
npm run check:showcase
npm run lint
npm run build
```

## Como o produto se organiza

```text
Mapa → versão publicada → execução → tarefa → revisão → próxima tarefa
                                     └──────────────→ agenda
```

- **Mapas** guardam a lógica espacial do processo.
- **Tarefas** são a unidade executável criada por cada etapa.
- **Agenda** é uma projeção dos prazos das tarefas.
- **Aplicativos** aproximam recursos do ponto do processo em que são necessários.

Mais detalhes em [Arquitetura](./docs/ARCHITECTURE.md) e [Módulos](./docs/MODULES.md).

## Limite público

O Mappi e esta demonstração são proprietários. A publicação do código para avaliação não concede licença de uso, cópia, distribuição ou exploração comercial. Consulte [NOTICE.md](./NOTICE.md) e [SECURITY.md](./SECURITY.md).
