pipeline {
    agent any

    environment {
        SONAR_TOKEN = credentials('sonar-token-id')       // Jenkins credentials ID for SonarQube token

        DOCKER_HUB_USER = 'jatinthakrann'                // Your Docker Hub username

        DOCKER_IMAGE = 'node-app'

        REGISTRY = 'docker.io'

        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout Application Code') {
            steps {
               git branch: 'main', url: 'https://github.com/jatin18csu095/node-app-cicd.git'
            }
        }

        stage('Code Analysis using SonarQube') {
            steps {
               withSonarQubeEnv('SonarQube') {
          withEnv(["PATH+SONAR=${tool 'SonarQube'}/bin"]) {
                       sh 'sonar-scanner -Dsonar.login=$SONAR_TOKEN'
          }
               }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $DOCKER_HUB_USER/$DOCKER_IMAGE:$IMAGE_TAG .'
            }
        }

        stage('Push into Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-hub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PWD')]) {
                    sh '''

            echo "$DOCKER_PWD" | docker login -u "$DOCKER_USER" --password-stdin

            docker push $DOCKER_HUB_USER/$DOCKER_IMAGE:$IMAGE_TAG

          '''
                }
            }
        }

        stage('Deploy using ArgoCD') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-push-creds', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh '''

            rm -rf node-k8s-deploy

            git clone https://$GIT_USER:$GIT_TOKEN@github.com/priyanshu29/node-k8s-deploy.git

            cd node-k8s-deploy/deployment

            sed -i 's|priyanshu0998/node-app:.*|$DOCKER_HUB_USER/$DOCKER_IMAGE:$IMAGE_TAG|' deployment.yaml

            git config user.email "youremail@example.com"

            git config user.name "$GIT_USER"

            git commit -am "Updated image tag to $IMAGE_TAG"

            git push https://$GIT_USER:$GIT_TOKEN@github.com/priyanshu29/node-k8s-deploy.git

          '''
                }
            }
        }
    }
}
