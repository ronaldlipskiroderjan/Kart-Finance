🏎️ RA Kart Racing - Gestão Financeira e Controle de Pilotos
Sobre o Projeto
O RA Kart Racing é um sistema web desenvolvido sob medida para solucionar as necessidades reais de gestão financeira de uma equipe de kart. O foco principal da aplicação é automatizar e centralizar o controle de pilotos, facilitando o registro de despesas operacionais (como compra de peças e manutenções) e a emissão de reembolsos.

O grande diferencial do sistema é o seu motor de "Fechamento de Mês", que cruza todas as tabelas financeiras, calcula automaticamente os saldos de cada piloto e gera um histórico detalhado de faturas (pagas e pendentes), eliminando o trabalho manual e garantindo a integridade do caixa da empresa.

Por que Go?
Inicialmente idealizado com um backend tradicional, o projeto foi migrado para Go (Golang) com o objetivo de alcançar a máxima performance em um ambiente de nuvem gratuito. A ausência de uma máquina virtual (JVM) permitiu a criação de um binário cloud-native que liga quase instantaneamente, consome uma fração de memória e elimina os longos tempos de carregamento (cold start), entregando uma experiência muito mais ágil para o usuário final.

Tecnologias Utilizadas

- Backend: Go (Golang)

- Fiber: Framework web focado em altíssima performance para o roteamento da API.

- GORM: ORM moderno para manipulação e validação das regras de negócio no banco de dados.

Frontend: ReactJS + Vite

- Interface de página única (SPA) rápida, fluida e responsiva.

Banco de Dados: PostgreSQL

- Hospedado via NeonDB, garantindo integridade referencial rígida para os dados financeiros.

Infraestrutura e Deploy:

- Render: Hospedagem da API em contêiner otimizado.

- Vercel: Hospedagem estática do Frontend com rotas configuradas.
