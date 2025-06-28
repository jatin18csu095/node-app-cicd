pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'jatinthakrann/node-app-cicd'
        DOCKER_CREDENTIALS_ID = 'docker-hub-creds' // Jenkins credentials ID
    }

    stages {
        stage('Checkout Code') {
            steps {
                git 'https://github.com/jatin18scu095/node-app-cicd.git'
            }
        }

        stage('Code Analysis') {
            steps {
                // Add SonarQube analysis here if configured

                echo 'SonarQube analysis would run here'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    sh 'docker build -t $DOCKER_IMAGE .'
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh """

                            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                            docker push $DOCKER_IMAGE

                        """
                    }
                }
            }
        }
    }
}

