#version 300 es
precision mediump float;

out vec4 FragColor;

uniform float ambientStrength, specularStrength, diffuseStrength, shininess;

in vec3 Normal; // 法向量
in vec3 FragPos; // 相机观察的片元位置
in vec2 TexCoord; // 纹理坐标
in vec4 FragPosLightSpace; // 光源观察的片元位置

uniform vec3 viewPos; // 相机位置
uniform vec4 u_lightPosition; // 光源位置
uniform vec3 lightColor; // 入射光颜色

uniform sampler2D diffuseTexture;
uniform sampler2D depthTexture;
uniform samplerCube cubeSampler; // 盒子纹理采样器
uniform int u_isMirror;

// TODO3: 添加阴影计算，返回1表示是阴影，返回0表示非阴影
float shadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir)
{
    // 透视除法并映射到 [0,1]
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;

    // 若不在光的裁剪区间内，认为不在阴影
    if (projCoords.x < 0.0 || projCoords.x > 1.0 ||
        projCoords.y < 0.0 || projCoords.y > 1.0 ||
        projCoords.z > 1.0) {
        return 0.0;
    }

    // 取深度贴图中最接近光源的深度
    float closestDepth = texture(depthTexture, projCoords.xy).r;
    float currentDepth = projCoords.z;

    // bias 减少自阴影（根据法线与光线角度调整）
    float bias = max(0.005 * (1.0 - dot(normal, lightDir)), 0.0005);

    // 简单硬阴影判断（currentDepth > closestDepth + bias 则在阴影中）
    if (currentDepth - bias > closestDepth) {
        return 1.0;
    } else {
        return 0.0;
    }
}

// 可选的辅助函数（保留用于调试或替代）
vec3 calcPhong(vec3 normal, vec3 fragPos, vec3 viewPos, vec3 lightPos, vec3 lightColor, vec3 texColor, float shininess) {
    vec3 N = normalize(normal);
    vec3 L = normalize(lightPos - fragPos);
    vec3 V = normalize(viewPos - fragPos);
    vec3 R = reflect(-L, N);

    vec3 ambient = ambientStrength * lightColor * texColor;

    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = diffuseStrength * diff * lightColor * texColor;

    float spec = 0.0;
    if (diff > 0.0) {
        spec = pow(max(dot(R, V), 0.0), shininess);
    }
    vec3 specular = specularStrength * spec * lightColor;

    return ambient + diffuse + specular;
}

void main()
{
    // 纹理采样
    vec3 TextureColor = texture(diffuseTexture, TexCoord).rgb;

    // 计算方向与向量
    vec3 norm = normalize(Normal);
    vec3 lightDir;
    if (u_lightPosition.w == 1.0)
        lightDir = normalize(u_lightPosition.xyz - FragPos);
    else
        lightDir = normalize(u_lightPosition.xyz); // 平行光直接用方向（假定已是单位向量）
    vec3 viewDir = normalize(viewPos - FragPos);

    if (u_isMirror == 1) {
        vec3 I = normalize(FragPos - viewPos);
        vec3 R = reflect(I, norm);
        vec3 envColor = texture(cubeSampler, R).rgb;
        FragColor = vec4(envColor, 1.0);
        return;
    }

    // TODO2: 根据 Phong Shading 计算 ambient, diffuse, specular（在片元着色器中）
    vec3 ambient = ambientStrength * lightColor * TextureColor;

    float diffFactor = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diffuseStrength * diffFactor * lightColor * TextureColor;

    float specFactor = 0.0;
    if (diffFactor > 0.0) {
        vec3 reflectDir = reflect(-lightDir, norm);
        specFactor = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    }
    vec3 specular = specularStrength * specFactor * lightColor;

    // 阴影判定
    float shadow = shadowCalculation(FragPosLightSpace, norm, lightDir);

    // 合成颜色：ambient 始终存在，diffuse/specular 受阴影影响
    vec3 lighting = ambient + (1.0 - shadow) * (diffuse + specular);

    FragColor = vec4(lighting, 1.0);
}


